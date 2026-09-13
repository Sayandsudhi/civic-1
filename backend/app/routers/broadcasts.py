import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_officer_or_admin
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.officer import DepartmentOfficer
from app.models.broadcast import Broadcast, AlertType
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Broadcasts & Advisories"])


def calculate_expires_at(expiry_option: Optional[str]) -> Tuple[Optional[datetime], str]:
    """
    Calculate expiration datetime and canonical option string based on officer selection:
    Options: 1 hr, 3 hr, 8 hr, 12 hr, 1 day, 7 day, 1 month, noexpiry
    """
    if not expiry_option:
        return None, "NO_EXPIRY"

    opt = str(expiry_option).strip().upper()
    now = datetime.now(timezone.utc)

    if opt in ["1_HR", "1 HR", "1H", "1_HOUR", "1 HOUR"]:
        return now + timedelta(hours=1), "1_HR"
    elif opt in ["3_HR", "3 HR", "3H", "3_HOURS", "3 HOURS"]:
        return now + timedelta(hours=3), "3_HR"
    elif opt in ["8_HR", "8 HR", "8H", "8_HOURS", "8 HOURS"]:
        return now + timedelta(hours=8), "8_HR"
    elif opt in ["12_HR", "12 HR", "12H", "12_HOURS", "12 HOURS"]:
        return now + timedelta(hours=12), "12_HR"
    elif opt in ["1_DAY", "1 DAY", "24H", "24_HR", "1_DAYS", "1 DAYS"]:
        return now + timedelta(days=1), "1_DAY"
    elif opt in ["7_DAY", "7 DAY", "7_DAYS", "7 DAYS", "1_WEEK", "1 WEEK"]:
        return now + timedelta(days=7), "7_DAY"
    elif opt in ["1_MONTH", "1 MONTH", "30_DAYS", "30 DAYS"]:
        return now + timedelta(days=30), "1_MONTH"
    elif opt in ["NO_EXPIRY", "NOEXPIRY", "NEVER", "NONE"]:
        return None, "NO_EXPIRY"

    return None, "NO_EXPIRY"


async def cleanup_expired_broadcasts(db: Session) -> List[int]:
    """
    Find all active broadcasts that have an expiration timestamp set and <= current UTC time.
    Deletes them from database and immediately emits WebSocket delete events so both citizen
    and officer panels purge them instantly in real time.
    """
    now = datetime.now(timezone.utc)
    expired = (
        db.query(Broadcast)
        .filter(
            Broadcast.is_active == True,
            Broadcast.expires_at != None,
            Broadcast.expires_at <= now
        )
        .all()
    )

    deleted_ids: List[int] = []
    for b in expired:
        b_id = b.id
        target_uid = b.target_user_id
        logger.info(f"Purging expired broadcast #{b_id} ('{b.title}') expired at {b.expires_at}")
        db.delete(b)
        deleted_ids.append(b_id)
        try:
            await ws_manager.broadcast_alert_deleted(b_id, target_user_id=target_uid)
        except Exception as ws_err:
            logger.error(f"WebSocket deletion notification error for broadcast #{b_id}: {ws_err}")

    if deleted_ids:
        db.commit()

    return deleted_ids


class BroadcastCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    alert_type: str = "ADVISORY"
    target_ward: Optional[str] = "All Wards"
    target_user_id: Optional[int] = None
    department_id: Optional[int] = None
    expiry_option: Optional[str] = "3_HR"

    @field_validator("alert_type", mode="before")
    @classmethod
    def validate_alert_type(cls, v):
        if isinstance(v, str):
            clean = v.strip().upper()
            if clean in ["INFO", "ADVISORY", "WARNING", "EMERGENCY"]:
                return clean
        return "ADVISORY"

    @field_validator("target_ward", mode="before")
    @classmethod
    def validate_ward(cls, v):
        if not v or not str(v).strip():
            return "All Wards"
        return str(v).strip()


def serialize_broadcast(b: Broadcast) -> dict:
    dept = b.department
    created_by_user = b.created_by
    return {
        "id": b.id,
        "title": b.title,
        "message": b.message,
        "alert_type": b.alert_type.value if hasattr(b.alert_type, "value") else str(b.alert_type),
        "department_id": b.department_id,
        "department_name": dept.name if dept else "Municipal Corporation",
        "department_code": dept.code if dept else "CIVIC_HQ",
        "department_icon": dept.icon if dept else "Building2",
        "target_ward": b.target_ward or "All Wards",
        "target_user_id": b.target_user_id,
        "created_by_id": b.created_by_id,
        "created_by_name": created_by_user.full_name if created_by_user else "City Operations",
        "is_active": b.is_active,
        "expires_at": b.expires_at.isoformat() if b.expires_at else None,
        "expiry_option": b.expiry_option or "NO_EXPIRY",
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None
    }


@router.get("/broadcasts")
async def get_public_broadcasts(db: Session = Depends(get_db)):
    """Fetch all active non-expired city-wide and ward broadcasts for public landing page and citizens."""
    await cleanup_expired_broadcasts(db)
    now = datetime.now(timezone.utc)
    broadcasts = (
        db.query(Broadcast)
        .filter(
            Broadcast.is_active == True,
            Broadcast.target_user_id == None,
            or_(Broadcast.expires_at == None, Broadcast.expires_at > now)
        )
        .order_by(Broadcast.created_at.desc())
        .limit(20)
        .all()
    )
    return [serialize_broadcast(b) for b in broadcasts]


@router.get("/citizen/notifications")
async def get_citizen_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch non-expired notifications relevant to the authenticated citizen:
    - City-wide broadcasts
    - Ward broadcasts
    - Direct messages sent specifically to this citizen by officers
    """
    await cleanup_expired_broadcasts(db)
    now = datetime.now(timezone.utc)
    broadcasts = (
        db.query(Broadcast)
        .filter(
            Broadcast.is_active == True,
            (Broadcast.target_user_id == None) | (Broadcast.target_user_id == current_user.id),
            or_(Broadcast.expires_at == None, Broadcast.expires_at > now)
        )
        .order_by(Broadcast.created_at.desc())
        .limit(30)
        .all()
    )
    return [serialize_broadcast(b) for b in broadcasts]


@router.get("/officer/broadcasts")
async def get_officer_broadcasts(
    current_user: User = Depends(require_officer_or_admin),
    db: Session = Depends(get_db)
):
    """
    List all active non-expired broadcasts published by this officer's department (or all if admin).
    """
    await cleanup_expired_broadcasts(db)
    now = datetime.now(timezone.utc)
    query = db.query(Broadcast).filter(
        Broadcast.is_active == True,
        or_(Broadcast.expires_at == None, Broadcast.expires_at > now)
    )
    
    if current_user.role == UserRole.DEPARTMENT_OFFICER:
        officer_profile = db.query(DepartmentOfficer).filter(
            DepartmentOfficer.user_id == current_user.id,
            DepartmentOfficer.is_active == True
        ).first()
        if not officer_profile:
            raise HTTPException(status_code=403, detail="Officer profile not found")
        query = query.filter(Broadcast.department_id == officer_profile.department_id)
    
    broadcasts = query.order_by(Broadcast.created_at.desc()).all()
    return [serialize_broadcast(b) for b in broadcasts]


@router.post("/officer/broadcasts", status_code=status.HTTP_201_CREATED)
async def create_broadcast(
    payload: BroadcastCreate,
    current_user: User = Depends(require_officer_or_admin),
    db: Session = Depends(get_db)
):
    """
    Post a new municipal advisory / ward announcement or direct message to a citizen.
    Includes calculated expiry timestamp (e.g. 1h, 3h, 8h, 12h, 1d, 7d, 1m, or no expiry).
    Emits real-time WebSocket push to citizen notification panels and officer dashboards.
    """
    target_dept_id = payload.department_id

    if current_user.role == UserRole.DEPARTMENT_OFFICER:
        officer_profile = db.query(DepartmentOfficer).filter(
            DepartmentOfficer.user_id == current_user.id,
            DepartmentOfficer.is_active == True
        ).first()
        if not officer_profile:
            raise HTTPException(status_code=403, detail="Officer profile not found")
        target_dept_id = officer_profile.department_id
    elif not target_dept_id:
        first_dept = db.query(Department).first()
        target_dept_id = first_dept.id if first_dept else 1

    dept = db.query(Department).filter(Department.id == target_dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    alert_enum = AlertType.ADVISORY
    try:
        alert_enum = AlertType(payload.alert_type.upper())
    except Exception:
        pass

    expires_at, clean_expiry_opt = calculate_expires_at(payload.expiry_option)

    new_broadcast = Broadcast(
        title=payload.title.strip(),
        message=payload.message.strip(),
        alert_type=alert_enum,
        department_id=target_dept_id,
        target_ward=payload.target_ward.strip() if payload.target_ward else "All Wards",
        target_user_id=payload.target_user_id,
        created_by_id=current_user.id,
        is_active=True,
        expires_at=expires_at,
        expiry_option=clean_expiry_opt
    )
    db.add(new_broadcast)
    db.commit()
    db.refresh(new_broadcast)

    serialized = serialize_broadcast(new_broadcast)

    # Real-time WebSocket Push to citizens and officers
    try:
        await ws_manager.broadcast_new_alert(serialized, target_user_id=payload.target_user_id)
    except Exception as e:
        logger.error(f"WebSocket broadcast error: {e}")

    return serialized


@router.delete("/officer/broadcasts/{broadcast_id}")
async def delete_broadcast(
    broadcast_id: int,
    current_user: User = Depends(require_officer_or_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a broadcast announcement.
    Synchronously triggers a WebSocket BROADCAST_DELETED event so it instantly
    disappears from all citizen and officer notification panels.
    """
    broadcast = db.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
    if not broadcast:
        raise HTTPException(status_code=404, detail="Broadcast not found")

    if current_user.role == UserRole.DEPARTMENT_OFFICER:
        officer_profile = db.query(DepartmentOfficer).filter(
            DepartmentOfficer.user_id == current_user.id,
            DepartmentOfficer.is_active == True
        ).first()
        if not officer_profile or officer_profile.department_id != broadcast.department_id:
            raise HTTPException(status_code=403, detail="Cannot delete broadcasts from another department")

    target_user_id = broadcast.target_user_id

    # Hard delete from DB so queries will never return it
    db.delete(broadcast)
    db.commit()

    # Emit real-time WebSocket event to all connected citizens & officers
    try:
        await ws_manager.broadcast_alert_deleted(broadcast_id, target_user_id=target_user_id)
    except Exception as e:
        logger.error(f"WebSocket delete broadcast error: {e}")

    return {
        "success": True,
        "deleted_id": broadcast_id,
        "message": "Broadcast announcement deleted and removed from citizen and officer panels."
    }
