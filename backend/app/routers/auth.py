from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, UserRole
from app.models.officer import DepartmentOfficer
from app.models.department import Department
from app.schemas.auth import (
    CitizenRegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    AdminLoginRequest,
    OfficerLoginRequest
)
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="", tags=["Authentication"])


def build_user_response(user: User, db: Session) -> UserResponse:
    dept_id = None
    dept_name = None
    badge_num = None

    if user.role == UserRole.DEPARTMENT_OFFICER:
        officer = db.query(DepartmentOfficer).filter(DepartmentOfficer.user_id == user.id).first()
        if officer:
            dept_id = officer.department_id
            badge_num = officer.badge_number
            dept = db.query(Department).filter(Department.id == officer.department_id).first()
            if dept:
                dept_name = dept.name

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        department_id=dept_id,
        department_name=dept_name,
        badge_number=badge_num
    )


@router.post("/auth/register", response_model=TokenResponse)
def register_citizen(data: CitizenRegisterRequest, db: Session = Depends(get_db)):
    # Check email exists
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    # Check username exists
    if db.query(User).filter(User.username == data.username.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken. Please choose another."
        )

    new_user = User(
        email=data.email.lower(),
        username=data.username.lower(),
        full_name=data.full_name,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        role=UserRole.CITIZEN,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.id, "role": new_user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_response(new_user, db)
    )


@router.post("/auth/login", response_model=TokenResponse)
def login_citizen(data: LoginRequest, db: Session = Depends(get_db)):
    identifier = data.username_or_email.lower().strip()
    user = db.query(User).filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your username/email and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact municipal support."
        )

    # Strictly enforce Citizen role for user portal
    if user.role != UserRole.CITIZEN:
        if user.role == UserRole.DEPARTMENT_OFFICER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Department officers must sign in through the Officer Portal (/officer)."
            )
        elif user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrators must sign in through the Admin Command Center (/admin)."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to Citizen accounts only."
            )

    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_response(user, db)
    )


@router.post("/admin/login", response_model=TokenResponse)
def login_admin(data: AdminLoginRequest, db: Session = Depends(get_db)):
    identifier = data.username.lower().strip()
    user = db.query(User).filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your administrator account is deactivated."
        )

    # Strictly enforce Admin role for admin portal
    if user.role != UserRole.ADMIN:
        if user.role == UserRole.DEPARTMENT_OFFICER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Department officers cannot access the Admin Command Center. Please sign in at /officer."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens cannot access the Admin Command Center. Please sign in at /login."
            )

    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_response(user, db)
    )


@router.post("/officer/login", response_model=TokenResponse)
def login_officer(data: OfficerLoginRequest, db: Session = Depends(get_db)):
    identifier = data.username.lower().strip()
    user = db.query(User).filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid department officer credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your officer account is currently disabled."
        )

    # Strictly enforce Department Officer role for officer portal
    if user.role != UserRole.DEPARTMENT_OFFICER:
        if user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrators must sign in through the Admin Command Center (/admin)."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens cannot access the Department Officer portal. Please sign in at /login."
            )

    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_response(user, db)
    )


@router.get("/auth/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_user_response(user, db)
