import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class AlertType(str, enum.Enum):
    INFO = "INFO"               # General municipal notification
    ADVISORY = "ADVISORY"       # Service interruption / planned maintenance
    WARNING = "WARNING"         # Hazard or disruption warning
    EMERGENCY = "EMERGENCY"     # Urgent public safety emergency


class Broadcast(Base):
    __tablename__ = "broadcasts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(Enum(AlertType), default=AlertType.INFO, nullable=False)
    
    # Department that issued this announcement
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    
    # Target Scope: "All Wards" or specific ward e.g. "Ward 4"
    target_ward = Column(String(100), default="All Wards", nullable=False)
    
    # Optional: target specific citizen user for 1-to-1 direct officer messaging
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Officer/Admin who published this
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    expiry_option = Column(String(50), default="NO_EXPIRY", nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    department = relationship("Department", backref="broadcasts")
    created_by = relationship("User", foreign_keys=[created_by_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
