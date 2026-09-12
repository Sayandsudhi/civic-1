from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.department import Department
from app.models.complaint import Complaint
from app.models.officer import DepartmentOfficer
from app.schemas.department import DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentResponse])
def get_active_departments(db: Session = Depends(get_db)):
    """Fetch all active municipal departments."""
    departments = db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()

    result = []
    for dept in departments:
        comp_count = db.query(func.count(Complaint.id)).filter(Complaint.department_id == dept.id).scalar() or 0
        officer_count = db.query(func.count(DepartmentOfficer.id)).filter(
            DepartmentOfficer.department_id == dept.id,
            DepartmentOfficer.is_active == True
        ).scalar() or 0

        res = DepartmentResponse(
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
        result.append(res)

    return result
