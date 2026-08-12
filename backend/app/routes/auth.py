import os

from fastapi import APIRouter, HTTPException, Request

from app.auth.roles import ADMIN, CUSTOMER
from app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.core.brute_force import login_guard
from app.core.logging import get_logger
from app.core.rate_limit import client_ip
from app.core.sanitize import sanitize_email
from app.models.user import (
    create_user,
    get_user_by_email,
)
from app.schemas.user import (
    Token,
    UserLogin,
    UserRegister,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

logger = get_logger(__name__)


@router.post("/register")
async def register(user: UserRegister):
    logger.info("auth.register request received")

    existing = await get_user_by_email(user.email)

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    user_data = user.model_dump()

    user_data["password"] = hash_password(
        user.password
    )

    user_id = await create_user(user_data)

    logger.info("auth.register completed successfully")
    return {
        "message": "User registered successfully",
        "id": user_id,
    }


@router.post(
    "/login",
    response_model=Token,
)
async def login(user: UserLogin, request: Request):
    logger.info("auth.login request received")

    email = sanitize_email(str(user.email)) or ""
    ip = client_ip(request)
    login_guard.assert_not_blocked(ip, email)

    db_user = await get_user_by_email(email)

    if not db_user:
        login_guard.record_failure(ip, email)
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        user.password,
        db_user["password"],
    ):
        login_guard.record_failure(ip, email)
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    login_guard.record_success(ip, email)

    token = create_access_token(
        {
            "sub": str(db_user["_id"]),
            "email": db_user["email"],
            "full_name": db_user["full_name"],
            "phone": db_user.get("phone"),
            "role": CUSTOMER,
        }
    )

    logger.info("auth.login completed successfully")
    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/admin/login", response_model=Token)
async def admin_login(user: UserLogin, request: Request):
    """Issue an admin JWT using credentials from environment variables."""
    logger.info("auth.admin_login request received")
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        raise HTTPException(
            status_code=503,
            detail="Admin login is not configured",
        )

    email = sanitize_email(str(user.email)) or ""
    ip = client_ip(request)
    login_guard.assert_not_blocked(ip, email)

    if (
        email != admin_email.lower()
        or user.password != admin_password
    ):
        login_guard.record_failure(ip, email)
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    login_guard.record_success(ip, email)

    token = create_access_token(
        {
            "sub": admin_email.lower(),
            "email": admin_email.lower(),
            "role": ADMIN,
        }
    )

    logger.info("auth.admin_login completed successfully")
    return {
        "access_token": token,
        "token_type": "bearer",
    }
