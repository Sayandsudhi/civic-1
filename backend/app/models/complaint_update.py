from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class ComplaintUpdate(Base):
    __tablename__ = "complaint_updates"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    action_type = Column(String(50), default="STATUS_CHANGE", nullable=False)  # STATUS_CHANGE, NOTE_ADDED, RESOLVED, ASSIGNED
    note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    complaint = relationship("Complaint", back_populates="updates")
    user = relationship("User", back_populates="updates")
