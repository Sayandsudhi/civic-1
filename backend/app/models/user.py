import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base


class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    ADMIN = "ADMIN"
    DEPARTMENT_OFFICER = "DEPARTMENT_OFFICER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CITIZEN, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    complaints = relationship("Complaint", back_populates="citizen", foreign_keys="Complaint.user_id")
    officer_profile = relationship("DepartmentOfficer", back_populates="user", uselist=False)
    updates = relationship("ComplaintUpdate", back_populates="user")
