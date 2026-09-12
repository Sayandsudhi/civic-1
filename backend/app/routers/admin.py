from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.db.database import get_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.officer import DepartmentOfficer
from app.models.complaint import Complaint, ComplaintStatus, PriorityLevel
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.schemas.officer import OfficerCreate, OfficerUpdate, OfficerResponse
from app.schemas.complaint import ComplaintResponse
from app.schemas.analytics import (
    AdminDashboardAnalytics,
    StatusCounts,
    PriorityCounts,
    DepartmentStatItem,
    PriorityDistributionItem,
    TimelineTrendItem
)
from app.dependencies.auth import require_admin
from app.routers.complaints import serialize_complaint

router = APIRouter(prefix="/admin", tags=["Administrator Operations"])


@router.get("/dashboard", response_model=AdminDashboardAnalytics)
def get_admin_dashboard_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Aggregate municipal metrics, department workloads, priority distributions, and trends."""
    # Status Counts
    total = db.query(func.count(Complaint.id)).scalar() or 0
    new_c = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.NEW).scalar() or 0
    assigned_c = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.ASSIGNED).scalar() or 0
    in_prog_c = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.IN_PROGRESS).scalar() or 0
    resolved_c = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.RESOLVED).scalar() or 0
    closed_c = db.query(func.count(Complaint.id)).filter(Complaint.status == ComplaintStatus.CLOSED).scalar() or 0

    status_counts = StatusCounts(
        total=total,
        new=new_c,
        assigned=assigned_c,
        in_progress=in_prog_c,
        resolved=resolved_c,
        closed=closed_c
    )

    # Priority Counts
    crit_c = db.query(func.count(Complaint.id)).filter(Complaint.priority_level == PriorityLevel.CRITICAL).scalar() or 0
    high_c = db.query(func.count(Complaint.id)).filter(Complaint.priority_level == PriorityLevel.HIGH).scalar() or 0
    med_c = db.query(func.count(Complaint.id)).filter(Complaint.priority_level == PriorityLevel.MEDIUM).scalar() or 0
    low_c = db.query(func.count(Complaint.id)).filter(Complaint.priority_level == PriorityLevel.LOW).scalar() or 0
    emerg_c = db.query(func.count(Complaint.id)).filter(Complaint.emergency == True).scalar() or 0

    priority_counts = PriorityCounts(
        critical=crit_c,
        high=high_c,
        medium=med_c,
        low=low_c,
        emergency_count=emerg_c
    )

    # Priority Distribution for charts
    priority_distribution = [
        PriorityDistributionItem(name="Critical", value=crit_c, color="#EF4444"),
        PriorityDistributionItem(name="High", value=high_c, color="#F97316"),
        PriorityDistributionItem(name="Medium", value=med_c, color="#FBBF24"),
        PriorityDistributionItem(name="Low", value=low_c, color="#10B981")
    ]

    # Department breakdown
    departments = db.query(Department).all()
    dept_breakdown = []
    for d in departments:
        d_total = db.query(func.count(Complaint.id)).filter(Complaint.department_id == d.id).scalar() or 0
        d_crit = db.query(func.count(Complaint.id)).filter(
            Complaint.department_id == d.id,
            Complaint.priority_level == PriorityLevel.CRITICAL
        ).scalar() or 0
        d_resolved = db.query(func.count(Complaint.id)).filter(
            Complaint.department_id == d.id,
            Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
        ).scalar() or 0
        d_rate = round((d_resolved / d_total * 100), 1) if d_total > 0 else 100.0

        dept_breakdown.append(DepartmentStatItem(
            id=d.id,
            name=d.name,
            code=d.code,
            total_complaints=d_total,
            critical_complaints=d_crit,
            resolved_complaints=d_resolved,
            resolution_rate=d_rate
        ))

    # 7-day trend
    now = datetime.now(timezone.utc)
    recent_trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_label = day_start.strftime("%b %d")

        t_count = db.query(func.count(Complaint.id)).filter(
            Complaint.created_at >= day_start,
            Complaint.created_at < day_end
        ).scalar() or 0

        c_count = db.query(func.count(Complaint.id)).filter(
            Complaint.created_at >= day_start,
            Complaint.created_at < day_end,
            Complaint.priority_level == PriorityLevel.CRITICAL
        ).scalar() or 0

        r_count = db.query(func.count(Complaint.id)).filter(
            Complaint.resolved_at >= day_start,
            Complaint.resolved_at < day_end
        ).scalar() or 0

        recent_trend.append(TimelineTrendItem(
            date=day_label,
            total=t_count,
            critical=c_count,
            resolved=r_count
        ))

    res_rate = round(((resolved_c + closed_c) / total * 100), 1) if total > 0 else 0.0

    return AdminDashboardAnalytics(
        status_counts=status_counts,
        priority_counts=priority_counts,
        departments_breakdown=dept_breakdown,
        priority_distribution=priority_distribution,
        recent_trend=recent_trend,
        resolution_rate=res_rate,
        avg_resolution_hours=14.5
    )


@router.get("/complaints", response_model=List[ComplaintResponse])
def get_all_complaints(
    department_id: Optional[int] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retrieve all municipal complaints with advanced administrative filters."""
    query = db.query(Complaint)

    if department_id:
        query = query.filter(Complaint.department_id == department_id)

    if priority and priority.upper() != "ALL":
        try:
            p_enum = PriorityLevel[priority.upper()]
            query = query.filter(Complaint.priority_level == p_enum)
        except KeyError:
            pass

    if status_filter and status_filter.upper() != "ALL":
        try:
            s_enum = ComplaintStatus[status_filter.upper()]
            query = query.filter(Complaint.status == s_enum)
        except KeyError:
            pass

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Complaint.complaint_number.ilike(s)) |
            (Complaint.title.ilike(s)) |
            (Complaint.description.ilike(s)) |
            (Complaint.location.ilike(s))
        )

    complaints = query.order_by(
        Complaint.emergency.desc(),
        Complaint.priority_score.desc(),
        Complaint.created_at.desc()
    ).all()

    return [serialize_complaint(c, db) for c in complaints]


# --- DEPARTMENT MANAGEMENT ---

@router.get("/departments", response_model=List[DepartmentResponse])
def get_admin_departments(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Fetch all departments (including disabled) with officer and complaint statistics."""
    departments = db.query(Department).order_by(Department.id.asc()).all()
    result = []
    for dept in departments:
        comp_count = db.query(func.count(Complaint.id)).filter(Complaint.department_id == dept.id).scalar() or 0
        officer_count = db.query(func.count(DepartmentOfficer.id)).filter(DepartmentOfficer.department_id == dept.id).scalar() or 0
        result.append(DepartmentResponse(
            id=dept.id,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            icon=dept.icon,
            is_active=dept.is_active,
            created_at=dept.created_at,
            complaints_count=comp_count,
            active_officers_count=officer_count
        ))
    return result


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(data: DepartmentCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Department).filter(Department.code == data.code.upper()).first():
        raise HTTPException(status_code=400, detail="A department with this code already exists.")
    if db.query(Department).filter(Department.name == data.name).first():
        raise HTTPException(status_code=400, detail="A department with this name already exists.")

    dept = Department(
        name=data.name,
        code=data.code.upper(),
        description=data.description,
        icon=data.icon or "Building2",
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        icon=dept.icon,
        is_active=dept.is_active,
        created_at=dept.created_at,
        complaints_count=0,
        active_officers_count=0
    )


@router.put("/departments/{id}", response_model=DepartmentResponse)
def update_department(id: int, data: DepartmentUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    if data.name is not None:
        dept.name = data.name
    if data.description is not None:
        dept.description = data.description
    if data.icon is not None:
        dept.icon = data.icon
    if data.is_active is not None:
        dept.is_active = data.is_active

    db.commit()
    db.refresh(dept)

    comp_count = db.query(func.count(Complaint.id)).filter(Complaint.department_id == dept.id).scalar() or 0
    officer_count = db.query(func.count(DepartmentOfficer.id)).filter(DepartmentOfficer.department_id == dept.id).scalar() or 0

    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        icon=dept.icon,
        is_active=dept.is_active,
        created_at=dept.created_at,
        complaints_count=comp_count,
        active_officers_count=officer_count
    )


@router.delete("/departments/{id}", response_model=dict)
def delete_department(id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    dept.is_active = False
    db.commit()
    return {"message": f"Department '{dept.name}' disabled successfully."}


# --- OFFICER MANAGEMENT ---

def serialize_officer(officer: DepartmentOfficer) -> OfficerResponse:
    return OfficerResponse(
        id=officer.id,
        user_id=officer.user_id,
        full_name=officer.user.full_name,
        username=officer.user.username,
        email=officer.user.email,
        phone=officer.user.phone,
        badge_number=officer.badge_number,
        department_id=officer.department_id,
        department_name=officer.department.name if officer.department else "Unassigned",
        department_code=officer.department.code if officer.department else "N/A",
        is_active=officer.is_active and officer.user.is_active,
        created_at=officer.created_at
    )


@router.get("/officers", response_model=List[OfficerResponse])
def get_admin_officers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """List all department officers with department details."""
    officers = db.query(DepartmentOfficer).join(User).order_by(DepartmentOfficer.id.asc()).all()
    return [serialize_officer(o) for o in officers]


@router.post("/officers", response_model=OfficerResponse, status_code=status.HTTP_201_CREATED)
def create_officer(data: OfficerCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Create a new department officer account."""
    if db.query(User).filter(User.username == data.username.lower()).first():
        raise HTTPException(status_code=400, detail="Username already in use.")
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already in use.")

    dept = db.query(Department).filter(Department.id == data.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Assigned department does not exist.")

    user = User(
        email=data.email.lower(),
        username=data.username.lower(),
        full_name=data.full_name,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        role=UserRole.DEPARTMENT_OFFICER,
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    officer = DepartmentOfficer(
        user_id=user.id,
        department_id=dept.id,
        badge_number=data.badge_number or f"BADGE-{user.id:04d}",
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(officer)
    db.commit()
    db.refresh(officer)

    return serialize_officer(officer)


@router.put("/officers/{id}", response_model=OfficerResponse)
def update_officer(id: int, data: OfficerUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    officer = db.query(DepartmentOfficer).filter(DepartmentOfficer.id == id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer profile not found.")

    user = officer.user

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.username is not None:
        existing = db.query(User).filter(User.username == data.username.lower(), User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username is already taken.")
        user.username = data.username.lower()
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email.lower(), User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already taken.")
        user.email = data.email.lower()
    if data.phone is not None:
        user.phone = data.phone
    if data.password:
        user.hashed_password = hash_password(data.password)
    if data.badge_number is not None:
        officer.badge_number = data.badge_number
    if data.department_id is not None:
        dept = db.query(Department).filter(Department.id == data.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Selected department does not exist.")
        officer.department_id = dept.id
    if data.is_active is not None:
        officer.is_active = data.is_active
        user.is_active = data.is_active

    db.commit()
    db.refresh(officer)
    return serialize_officer(officer)


@router.delete("/officers/{id}", response_model=dict)
def delete_officer(id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    officer = db.query(DepartmentOfficer).filter(DepartmentOfficer.id == id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer profile not found.")

    officer.is_active = False
    officer.user.is_active = False
    db.commit()
    return {"message": f"Officer '{officer.user.full_name}' account has been deactivated."}
