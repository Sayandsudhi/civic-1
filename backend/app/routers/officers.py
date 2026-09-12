from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.officer import DepartmentOfficer
from app.models.complaint import Complaint, ComplaintStatus
from app.models.complaint_update import ComplaintUpdate
from app.schemas.complaint import (
    ComplaintResponse,
    ComplaintDetailResponse,
    ComplaintStatusUpdate,
    ComplaintNoteCreate,
    ComplaintUpdateResponse
)
from app.dependencies.auth import require_officer
from app.routers.complaints import serialize_complaint
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/officer", tags=["Department Officers"])


def get_officer_context(current_user: User, db: Session) -> DepartmentOfficer:
    officer = db.query(DepartmentOfficer).filter(
        DepartmentOfficer.user_id == current_user.id,
        DepartmentOfficer.is_active == True
    ).first()
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active department officer profile not found."
        )
    return officer


@router.get("/complaints", response_model=List[ComplaintResponse])
def get_department_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db)
):
    """
    Department operations queue:
    - Strictly scoped to officer's assigned department.
    - Deterministically sorted:
      1. Emergency flag DESC (Emergency incidents first)
      2. Priority score DESC (Highest urgency/risk first)
      3. Created at ASC (Older unresolved issues first within same priority tier)
    """
    officer = get_officer_context(current_user, db)

    query = db.query(Complaint).filter(Complaint.department_id == officer.department_id)

    if status_filter and status_filter.upper() != "ALL":
        try:
            enum_val = ComplaintStatus[status_filter.upper()]
            query = query.filter(Complaint.status == enum_val)
        except KeyError:
            pass

    # Sort: Emergency first, then highest priority score, then oldest first
    complaints = query.order_by(
        Complaint.emergency.desc(),
        Complaint.priority_score.desc(),
        Complaint.created_at.asc()
    ).all()

    return [serialize_complaint(c, db) for c in complaints]


@router.get("/complaints/{id}", response_model=ComplaintDetailResponse)
def get_department_complaint_detail(
    id: int,
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db)
):
    """View complaint detail with strict departmental access check."""
    officer = get_officer_context(current_user, db)

    complaint = db.query(Complaint).filter(
        Complaint.id == id,
        Complaint.department_id == officer.department_id
    ).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found or belongs to a different department."
        )

    base = serialize_complaint(complaint, db)
    updates = db.query(ComplaintUpdate).filter(
        ComplaintUpdate.complaint_id == complaint.id
    ).order_by(ComplaintUpdate.created_at.asc()).all()

    update_list = [
        ComplaintUpdateResponse(
            id=u.id,
            complaint_id=u.complaint_id,
            user_id=u.user_id,
            user_name=u.user.full_name if u.user else "Officer",
            old_status=u.old_status,
            new_status=u.new_status,
            action_type=u.action_type,
            note=u.note,
            created_at=u.created_at
        ) for u in updates
    ]

    return ComplaintDetailResponse(**base.model_dump(), updates=update_list)


@router.put("/complaints/{id}/status", response_model=ComplaintDetailResponse)
async def update_complaint_status(
    id: int,
    data: ComplaintStatusUpdate,
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db)
):
    """Update complaint status (NEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED) with audit trail."""
    officer = get_officer_context(current_user, db)

    complaint = db.query(Complaint).filter(
        Complaint.id == id,
        Complaint.department_id == officer.department_id
    ).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found or does not belong to your department."
        )

    old_status = complaint.status.value
    new_status = data.status.value
    now = datetime.now(timezone.utc)

    complaint.status = data.status
    complaint.updated_at = now
    complaint.assigned_officer_id = officer.id

    if data.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
        if not complaint.resolved_at:
            complaint.resolved_at = now
    else:
        complaint.resolved_at = None

    audit_note = data.note or f"Status transitioned from {old_status} to {new_status} by Officer {current_user.full_name}."

    update_record = ComplaintUpdate(
        complaint_id=complaint.id,
        user_id=current_user.id,
        old_status=old_status,
        new_status=new_status,
        action_type="STATUS_CHANGE",
        note=audit_note,
        created_at=now
    )
    db.add(update_record)
    db.commit()
    db.refresh(complaint)

    base = serialize_complaint(complaint, db)
    updates = db.query(ComplaintUpdate).filter(
        ComplaintUpdate.complaint_id == complaint.id
    ).order_by(ComplaintUpdate.created_at.asc()).all()

    update_list = [
        ComplaintUpdateResponse(
            id=u.id,
            complaint_id=u.complaint_id,
            user_id=u.user_id,
            user_name=u.user.full_name if u.user else "Officer",
            old_status=u.old_status,
            new_status=u.new_status,
            action_type=u.action_type,
            note=u.note,
            created_at=u.created_at
        ) for u in updates
    ]

    resp = ComplaintDetailResponse(**base.model_dump(), updates=update_list)

    # Real-time broadcast
    try:
        await ws_manager.broadcast_status_update(
            department_id=complaint.department_id,
            user_id=complaint.user_id,
            complaint_data=resp.model_dump(mode="json")
        )
    except Exception:
        pass

    return resp


@router.post("/complaints/{id}/update", response_model=ComplaintDetailResponse)
async def add_officer_note(
    id: int,
    data: ComplaintNoteCreate,
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db)
):
    """Append official inspection notes or field updates to complaint log."""
    officer = get_officer_context(current_user, db)

    complaint = db.query(Complaint).filter(
        Complaint.id == id,
        Complaint.department_id == officer.department_id
    ).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found or belongs to a different department."
        )

    now = datetime.now(timezone.utc)
    complaint.updated_at = now
    complaint.assigned_officer_id = officer.id

    update_record = ComplaintUpdate(
        complaint_id=complaint.id,
        user_id=current_user.id,
        old_status=complaint.status.value,
        new_status=complaint.status.value,
        action_type="NOTE_ADDED",
        note=data.note,
        created_at=now
    )
    db.add(update_record)
    db.commit()
    db.refresh(complaint)

    base = serialize_complaint(complaint, db)
    updates = db.query(ComplaintUpdate).filter(
        ComplaintUpdate.complaint_id == complaint.id
    ).order_by(ComplaintUpdate.created_at.asc()).all()

    update_list = [
        ComplaintUpdateResponse(
            id=u.id,
            complaint_id=u.complaint_id,
            user_id=u.user_id,
            user_name=u.user.full_name if u.user else "Officer",
            old_status=u.old_status,
            new_status=u.new_status,
            action_type=u.action_type,
            note=u.note,
            created_at=u.created_at
        ) for u in updates
    ]

    resp = ComplaintDetailResponse(**base.model_dump(), updates=update_list)
    return resp
