from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    icon: Optional[str] = "Building2"
    is_active: Optional[bool] = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    complaints_count: Optional[int] = 0
    active_officers_count: Optional[int] = 0

    class Config:
        from_attributes = True
