import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base


class ComplaintStatus(str, enum.Enum):
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class PriorityLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_number = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("department_officers.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)

    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.NEW, nullable=False, index=True)

    # AI Prioritization fields (0 to 100)
    severity = Column(Integer, default=50, nullable=False)
    urgency = Column(Integer, default=50, nullable=False)
    public_impact = Column(Integer, default=50, nullable=False)
    safety_risk = Column(Integer, default=50, nullable=False)
    priority_score = Column(Integer, default=50, nullable=False, index=True)
    priority_level = Column(Enum(PriorityLevel), default=PriorityLevel.MEDIUM, nullable=False, index=True)
    emergency = Column(Boolean, default=False, nullable=False, index=True)
    ai_reason = Column(Text, nullable=True)
    ai_provider = Column(String(100), default="heuristic", nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    citizen = relationship("User", back_populates="complaints", foreign_keys=[user_id])
    department = relationship("Department", back_populates="complaints")
    assigned_officer = relationship("DepartmentOfficer", back_populates="assigned_complaints")
    updates = relationship("ComplaintUpdate", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintUpdate.created_at.desc()")
