import os

from fastapi import APIRouter, HTTPException

from app.auth.roles import ADMIN, CUSTOMER
from app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.core.logging import get_logger
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
async def login(user: UserLogin):
    logger.info("auth.login request received")

    db_user = await get_user_by_email(user.email)

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        user.password,
        db_user["password"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

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
async def admin_login(user: UserLogin):
    """Issue an admin JWT using credentials from environment variables."""
    logger.info("auth.admin_login request received")
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        raise HTTPException(
            status_code=503,
            detail="Admin login is not configured",
        )

    if (
        user.email.lower() != admin_email.lower()
        or user.password != admin_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

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
