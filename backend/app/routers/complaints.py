import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.officer import DepartmentOfficer
from app.models.complaint import Complaint, ComplaintStatus, PriorityLevel
from app.models.complaint_update import ComplaintUpdate
from app.schemas.complaint import ComplaintResponse, ComplaintDetailResponse, ComplaintUpdateResponse
from app.dependencies.auth import get_current_user, require_citizen
from app.services.ai_priority import analyze_complaint
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def generate_complaint_number(db: Session) -> str:
    """Generate human-readable complaint identifier: CP-2026-000001."""
    year = datetime.now().year
    count = db.query(func.count(Complaint.id)).scalar() or 0
    seq = count + 1
    return f"CP-{year}-{seq:06d}"


def serialize_complaint(c: Complaint, db: Session) -> ComplaintResponse:
    citizen_name = c.citizen.full_name if c.citizen else "Anonymous Citizen"
    citizen_email = c.citizen.email if c.citizen else None
    citizen_phone = c.citizen.phone if c.citizen else None
    dept_name = c.department.name if c.department else "Unassigned"
    dept_code = c.department.code if c.department else "N/A"
    officer_name = c.assigned_officer.user.full_name if c.assigned_officer and c.assigned_officer.user else None

    resolution_note = None
    if hasattr(c, 'updates') and c.updates:
        for u in c.updates:
            if u.new_status in ["RESOLVED", "CLOSED"]:
                resolution_note = u.note
                break
        if not resolution_note and c.status.value in ["RESOLVED", "CLOSED"] and c.updates:
            resolution_note = c.updates[0].note

    return ComplaintResponse(
        id=c.id,
        complaint_number=c.complaint_number,
        user_id=c.user_id,
        citizen_name=citizen_name,
        citizen_email=citizen_email,
        citizen_phone=citizen_phone,
        department_id=c.department_id,
        department_name=dept_name,
        department_code=dept_code,
        assigned_officer_id=c.assigned_officer_id,
        assigned_officer_name=officer_name,
        title=c.title,
        description=c.description,
        location=c.location,
        image_url=c.image_url,
        status=c.status,
        severity=c.severity,
        urgency=c.urgency,
        public_impact=c.public_impact,
        safety_risk=c.safety_risk,
        priority_score=c.priority_score,
        priority_level=c.priority_level,
        emergency=c.emergency,
        ai_reason=c.ai_reason,
        ai_provider=c.ai_provider,
        created_at=c.created_at,
        updated_at=c.updated_at,
        resolved_at=c.resolved_at,
        resolution_note=resolution_note
    )


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    department_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    location: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Citizen complaint submission.
    1. Validates inputs and optional image attachment
    2. Runs Groq AI priority analysis with Emergency Safety Check
    3. Persists complaint with human-readable tracking ID
    4. Records initial timeline audit step
    5. Broadcasts event in real-time via WebSockets
    """
    dept = db.query(Department).filter(Department.id == department_id, Department.is_active == True).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified municipal department does not exist or is inactive."
        )

    image_url = None
    if image and image.filename:
        # Validate extension
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file format '{ext}'. Allowed image formats: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
            )

        # Read file and check size (<= 5MB)
        contents = await image.read()
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file exceeds {settings.MAX_FILE_SIZE_MB}MB size limit."
            )

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        image_url = f"/uploads/{unique_filename}"

    # AI Analysis & Emergency Override
    ai_result = analyze_complaint(title=title, description=description, department_name=dept.name)

    complaint_num = generate_complaint_number(db)
    now = datetime.now(timezone.utc)

    complaint = Complaint(
        complaint_number=complaint_num,
        user_id=current_user.id,
        department_id=dept.id,
        title=title.strip(),
        description=description.strip(),
        location=location.strip() if location else None,
        image_url=image_url,
        status=ComplaintStatus.NEW,
        severity=ai_result.severity,
        urgency=ai_result.urgency,
        public_impact=ai_result.public_impact,
        safety_risk=ai_result.safety_risk,
        priority_score=ai_result.priority_score,
        priority_level=ai_result.priority_level,
        emergency=ai_result.emergency,
        ai_reason=ai_result.ai_reason,
        ai_provider=ai_result.ai_provider,
        created_at=now,
        updated_at=now
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Add initial creation timeline
    initial_update = ComplaintUpdate(
        complaint_id=complaint.id,
        user_id=current_user.id,
        old_status=None,
        new_status="NEW",
        action_type="SUBMITTED",
        note=f"Complaint lodged by citizen. Automated AI Priority assigned: {ai_result.priority_level} ({ai_result.priority_score}/100)."
    )
    db.add(initial_update)
    db.commit()

    serialized = serialize_complaint(complaint, db)

    # Real-time WebSocket broadcast to department officer & admin monitoring
    try:
        await ws_manager.broadcast_new_complaint(dept.id, serialized.model_dump(mode="json"))
    except Exception:
        pass

    return serialized


@router.get("/my", response_model=List[ComplaintResponse])
def get_my_complaints(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """Retrieve all complaints raised by the current authenticated citizen."""
    complaints = db.query(Complaint).filter(
        Complaint.user_id == current_user.id
    ).order_by(Complaint.created_at.desc()).all()

    return [serialize_complaint(c, db) for c in complaints]


@router.get("/track/{complaint_number}", response_model=ComplaintDetailResponse)
def track_complaint(
    complaint_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tracking endpoint with strict ownership enforcement:
    - Logged-in citizen can ONLY track their own complaints (complaint.user_id == current_user.id).
    - Department officer can track complaints belonging to their assigned department.
    - Administrator can audit any complaint.
    """
    clean_number = complaint_number.strip().upper()
    complaint = db.query(Complaint).filter(Complaint.complaint_number == clean_number).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No complaint found matching ID '{complaint_number}'."
        )

    # STRICT USER OWNERSHIP ENFORCEMENT
    if current_user.role == UserRole.CITIZEN and complaint.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: You are only permitted to track complaints submitted from your own account."
        )

    if current_user.role == UserRole.DEPARTMENT_OFFICER:
        officer = db.query(DepartmentOfficer).filter(DepartmentOfficer.user_id == current_user.id).first()
        if not officer or officer.department_id != complaint.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted: This complaint belongs to a different municipal department."
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
            user_name=u.user.full_name if u.user else "Civic System",
            old_status=u.old_status,
            new_status=u.new_status,
            action_type=u.action_type,
            note=u.note,
            created_at=u.created_at
        ) for u in updates
    ]

    return ComplaintDetailResponse(**base.model_dump(), updates=update_list)


@router.get("/{id}", response_model=ComplaintDetailResponse)
def get_complaint_details(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed complaint information including timeline updates.
    Enforces authorization:
    - Citizen can view only their own complaints.
    - Department Officer can view only complaints for their assigned department.
    - Admin can view any complaint.
    """
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {id} does not exist."
        )

    if current_user.role == UserRole.CITIZEN and complaint.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this complaint."
        )

    if current_user.role == UserRole.DEPARTMENT_OFFICER:
        officer = db.query(DepartmentOfficer).filter(DepartmentOfficer.user_id == current_user.id).first()
        if not officer or officer.department_id != complaint.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This complaint belongs to a different municipal department."
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
            user_name=u.user.full_name if u.user else "Civic System",
            old_status=u.old_status,
            new_status=u.new_status,
            action_type=u.action_type,
            note=u.note,
            created_at=u.created_at
        ) for u in updates
    ]

    return ComplaintDetailResponse(**base.model_dump(), updates=update_list)
