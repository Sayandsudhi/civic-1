from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.complaint import ComplaintStatus, PriorityLevel


class ComplaintCreate(BaseModel):
    department_id: int
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    location: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    note: Optional[str] = None


class ComplaintNoteCreate(BaseModel):
    note: str = Field(..., min_length=2)


class ComplaintUpdateResponse(BaseModel):
    id: int
    complaint_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    old_status: Optional[str] = None
    new_status: str
    action_type: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ComplaintResponse(BaseModel):
    id: int
    complaint_number: str
    user_id: int
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    citizen_phone: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None

    title: str
    description: str
    location: Optional[str] = None
    image_url: Optional[str] = None
    status: ComplaintStatus

    severity: int
    urgency: int
    public_impact: int
    safety_risk: int
    priority_score: int
    priority_level: PriorityLevel
    emergency: bool
    ai_reason: Optional[str] = None
    ai_provider: str

    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

    class Config:
        from_attributes = True


class ComplaintDetailResponse(ComplaintResponse):
    updates: List[ComplaintUpdateResponse] = []


class ComplaintAIAnalysisResponse(BaseModel):
    severity: int
    urgency: int
    public_impact: int
    safety_risk: int
    priority_score: int
    priority_level: PriorityLevel
    emergency: bool
    ai_reason: str
    ai_provider: str
