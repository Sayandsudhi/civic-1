from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class OfficerCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6)
    department_id: int
    phone: Optional[str] = None
    badge_number: Optional[str] = None
    is_active: Optional[bool] = True


class OfficerUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    department_id: Optional[int] = None
    phone: Optional[str] = None
    badge_number: Optional[str] = None
    is_active: Optional[bool] = None


class OfficerResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    username: str
    email: str
    phone: Optional[str] = None
    badge_number: Optional[str] = None
    department_id: int
    department_name: str
    department_code: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
