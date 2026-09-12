import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.database import Base, engine, SessionLocal
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.officer import DepartmentOfficer
from app.models.complaint import Complaint, ComplaintStatus, PriorityLevel
from app.models.complaint_update import ComplaintUpdate

logger = logging.getLogger(__name__)


def init_database():
    """Create all tables and seed initial platform data."""
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # 1. Default Admin Account
        admin_user = db.query(User).filter(User.username == settings.ADMIN_USERNAME.lower()).first()
        if not admin_user:
            logger.info(f"Creating default administrator '{settings.ADMIN_USERNAME}'...")
            admin_user = User(
                email="admin@civicpulse.gov",
                username=settings.ADMIN_USERNAME.lower(),
                full_name="Municipal Administrator",
                phone="+91 98765 43210",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # 2. Default Municipal Departments
        default_depts = [
            {
                "name": "KSEB / Electricity",
                "code": "KSEB_ELECTRICITY",
                "description": "State electricity grid, high-voltage lines, street lights, and transformer safety.",
                "icon": "Zap"
            },
            {
                "name": "Road Safety",
                "code": "ROAD_SAFETY",
                "description": "Highways, arterial roads, pothole repairs, traffic signals, and bridge maintenance.",
                "icon": "Car"
            },
            {
                "name": "Food Safety",
                "code": "FOOD_SAFETY",
                "description": "Public eateries, hygiene inspections, adulteration reports, and food vendor compliance.",
                "icon": "UtensilsCrossed"
            },
            {
                "name": "Water Supply",
                "code": "WATER_SUPPLY",
                "description": "Municipal water pipelines, reservoir supply, drinking water contamination, and leaks.",
                "icon": "Droplets"
            },
            {
                "name": "Sanitation & Waste",
                "code": "SANITATION_WASTE",
                "description": "Waste disposal, open dump sites, public bins, and storm water drain blockage clearing.",
                "icon": "Trash2"
            },
            {
                "name": "Public Health",
                "code": "PUBLIC_HEALTH",
                "description": "Vector control, epidemic surveillance, municipal clinic sanitation, and biological risks.",
                "icon": "HeartPulse"
            }
        ]

        dept_map = {}
        for d_data in default_depts:
            dept = db.query(Department).filter(Department.code == d_data["code"]).first()
            if not dept:
                dept = Department(
                    name=d_data["name"],
                    code=d_data["code"],
                    description=d_data["description"],
                    icon=d_data["icon"],
                    is_active=True
                )
                db.add(dept)
                db.commit()
                db.refresh(dept)
            dept_map[d_data["code"]] = dept

        # 3. Default Demo Citizen
        citizen = db.query(User).filter(User.username == "citizen").first()
        if not citizen:
            citizen = User(
                email="citizen@civicpulse.org",
                username="citizen",
                full_name="Aarav Sharma",
                phone="+91 98400 12345",
                hashed_password=hash_password("citizen123"),
                role=UserRole.CITIZEN,
                is_active=True
            )
            db.add(citizen)
            db.commit()
            db.refresh(citizen)

        # 4. Default Department Officers
        officer_data_list = [
            {
                "username": "officer_kseb",
                "email": "kseb.officer@civicpulse.gov",
                "full_name": "Er. Rajesh Kumar",
                "phone": "+91 94470 11223",
                "badge": "KSEB-EX-042",
                "dept_code": "KSEB_ELECTRICITY",
                "password": "officer123"
            },
            {
                "username": "officer_road",
                "email": "roads.officer@civicpulse.gov",
                "full_name": "Inspector Meera Nair",
                "phone": "+91 94470 33445",
                "badge": "ROAD-EN-108",
                "dept_code": "ROAD_SAFETY",
                "password": "officer123"
            },
            {
                "username": "officer_food",
                "email": "food.officer@civicpulse.gov",
                "full_name": "Dr. Vivek Menon",
                "phone": "+91 94470 55667",
                "badge": "FSO-DIV-210",
                "dept_code": "FOOD_SAFETY",
                "password": "officer123"
            }
        ]

        officer_profiles = {}
        for o_info in officer_data_list:
            o_user = db.query(User).filter(User.username == o_info["username"]).first()
            if not o_user:
                o_user = User(
                    email=o_info["email"],
                    username=o_info["username"],
                    full_name=o_info["full_name"],
                    phone=o_info["phone"],
                    hashed_password=hash_password(o_info["password"]),
                    role=UserRole.DEPARTMENT_OFFICER,
                    is_active=True
                )
                db.add(o_user)
                db.commit()
                db.refresh(o_user)

                dept = dept_map.get(o_info["dept_code"])
                if dept:
                    officer_prof = DepartmentOfficer(
                        user_id=o_user.id,
                        department_id=dept.id,
                        badge_number=o_info["badge"],
                        is_active=True
                    )
                    db.add(officer_prof)
                    db.commit()
                    db.refresh(officer_prof)
                    officer_profiles[o_info["dept_code"]] = officer_prof
            else:
                prof = db.query(DepartmentOfficer).filter(DepartmentOfficer.user_id == o_user.id).first()
                if prof:
                    officer_profiles[o_info["dept_code"]] = prof

        # 5. Seed Initial Realistic Complaints if database is empty
        comp_count = db.query(Complaint).count()
        if comp_count == 0:
            now = datetime.now(timezone.utc)
            sample_complaints = [
                {
                    "number": "CP-2026-000001",
                    "dept_code": "KSEB_ELECTRICITY",
                    "title": "Live electrical wire snapped and sparking on public pedestrian road near school",
                    "description": "A high-tension 11kV electrical cable snapped during winds and is sparking live across the main school footpath. Children and commuters are currently at risk of fatal electrocution.",
                    "location": "St. Mary's Higher Secondary Junction, MG Road",
                    "status": ComplaintStatus.NEW,
                    "severity": 96,
                    "urgency": 98,
                    "public_impact": 92,
                    "safety_risk": 99,
                    "priority_score": 97,
                    "priority_level": PriorityLevel.CRITICAL,
                    "emergency": True,
                    "ai_reason": "⚠️ [EMERGENCY OVERRIDE - ELECTRICAL_HAZARD]: Immediate risk of electrocution in a public high-traffic school zone.",
                    "created_offset_hours": 1
                },
                {
                    "number": "CP-2026-000002",
                    "dept_code": "ROAD_SAFETY",
                    "title": "Deep crater pothole causing multiple motorcycle falls and accidents",
                    "description": "A 3-foot wide deep pothole right after the flyover descent has caused 3 two-wheelers to crash last night. Traffic is dangerously swerving into oncoming lanes.",
                    "location": "North Overbridge descent, Pillar 42",
                    "status": ComplaintStatus.IN_PROGRESS,
                    "severity": 85,
                    "urgency": 86,
                    "public_impact": 88,
                    "safety_risk": 82,
                    "priority_score": 85,
                    "priority_level": PriorityLevel.HIGH,
                    "emergency": False,
                    "ai_reason": "High-velocity roadway defect causing ongoing vehicular accidents with substantial commuter traffic impact.",
                    "created_offset_hours": 6
                },
                {
                    "number": "CP-2026-000003",
                    "dept_code": "FOOD_SAFETY",
                    "title": "Suspected food adulteration and expired dairy stock at Supermarket",
                    "description": "Purchased milk and dairy products containing unnatural chemical stench and spoiled texture. Multiple families reported stomach illness.",
                    "location": "City Centre Supermarket, Sector 4",
                    "status": ComplaintStatus.NEW,
                    "severity": 65,
                    "urgency": 68,
                    "public_impact": 62,
                    "safety_risk": 66,
                    "priority_score": 65,
                    "priority_level": PriorityLevel.MEDIUM,
                    "emergency": False,
                    "ai_reason": "Public health concern involving contaminated commercial food stock with moderate localized consumer impact.",
                    "created_offset_hours": 14
                },
                {
                    "number": "CP-2026-000004",
                    "dept_code": "WATER_SUPPLY",
                    "title": "Slow public tap leakage wasting clean drinking water in community park",
                    "description": "Public water tap in the corner of children park has a slow dripping valve. Clean water is being wasted into the grass.",
                    "location": "Ward 12 Children's Park, East Wing",
                    "status": ComplaintStatus.RESOLVED,
                    "severity": 30,
                    "urgency": 35,
                    "public_impact": 28,
                    "safety_risk": 15,
                    "priority_score": 26,
                    "priority_level": PriorityLevel.LOW,
                    "emergency": False,
                    "ai_reason": "Low-risk conservation maintenance issue with minimal public safety hazard.",
                    "created_offset_hours": 48
                }
            ]

            for s_item in sample_complaints:
                dept = dept_map.get(s_item["dept_code"])
                if not dept:
                    continue
                c_time = now - timedelta(hours=s_item["created_offset_hours"])
                c = Complaint(
                    complaint_number=s_item["number"],
                    user_id=citizen.id,
                    department_id=dept.id,
                    title=s_item["title"],
                    description=s_item["description"],
                    location=s_item["location"],
                    image_url=None,
                    status=s_item["status"],
                    severity=s_item["severity"],
                    urgency=s_item["urgency"],
                    public_impact=s_item["public_impact"],
                    safety_risk=s_item["safety_risk"],
                    priority_score=s_item["priority_score"],
                    priority_level=s_item["priority_level"],
                    emergency=s_item["emergency"],
                    ai_reason=s_item["ai_reason"],
                    ai_provider="civicpulse:ai-engine",
                    created_at=c_time,
                    updated_at=c_time,
                    resolved_at=c_time + timedelta(hours=10) if s_item["status"] == ComplaintStatus.RESOLVED else None
                )
                db.add(c)
                db.commit()
                db.refresh(c)

                # Add update timeline
                u = ComplaintUpdate(
                    complaint_id=c.id,
                    user_id=citizen.id,
                    old_status=None,
                    new_status="NEW",
                    action_type="SUBMITTED",
                    note="Complaint submitted by citizen and analyzed by AI Priority Engine.",
                    created_at=c_time
                )
                db.add(u)
                if s_item["status"] == ComplaintStatus.IN_PROGRESS:
                    u2 = ComplaintUpdate(
                        complaint_id=c.id,
                        user_id=admin_user.id,
                        old_status="NEW",
                        new_status="IN_PROGRESS",
                        action_type="STATUS_CHANGE",
                        note="Assigned to municipal field squad for urgent containment.",
                        created_at=c_time + timedelta(hours=2)
                    )
                    db.add(u2)
                elif s_item["status"] == ComplaintStatus.RESOLVED:
                    u2 = ComplaintUpdate(
                        complaint_id=c.id,
                        user_id=admin_user.id,
                        old_status="NEW",
                        new_status="RESOLVED",
                        action_type="RESOLVED",
                        note="Field squad replaced valve assembly. Leakage resolved.",
                        created_at=c_time + timedelta(hours=10)
                    )
                    db.add(u2)
                db.commit()

        logger.info("Database initialization and seeding completed successfully.")
    finally:
        db.close()
