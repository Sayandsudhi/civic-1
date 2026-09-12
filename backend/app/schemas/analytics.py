from typing import List, Dict, Any
from pydantic import BaseModel


class StatusCounts(BaseModel):
    total: int = 0
    new: int = 0
    assigned: int = 0
    in_progress: int = 0
    resolved: int = 0
    closed: int = 0


class PriorityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    emergency_count: int = 0


class DepartmentStatItem(BaseModel):
    id: int
    name: str
    code: str
    total_complaints: int
    critical_complaints: int
    resolved_complaints: int
    resolution_rate: float


class PriorityDistributionItem(BaseModel):
    name: str
    value: int
    color: str


class TimelineTrendItem(BaseModel):
    date: str
    total: int
    critical: int
    resolved: int


class AdminDashboardAnalytics(BaseModel):
    status_counts: StatusCounts
    priority_counts: PriorityCounts
    departments_breakdown: List[DepartmentStatItem]
    priority_distribution: List[PriorityDistributionItem]
    recent_trend: List[TimelineTrendItem]
    resolution_rate: float
    avg_resolution_hours: float
