import os

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.auth.roles import ADMIN, CUSTOMER, RESTAURANT_OWNER, DELIVERY_PARTNER
from app.auth.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    verify_password,
)
from app.core.brute_force import login_guard
from app.core.database import database
from app.core.logging import get_logger
from app.core.rate_limit import client_ip
from app.core.sanitize import sanitize_email
from app.models.user import (
    create_user,
    get_user_by_email,
)
from app.schemas.user import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserRegister,
)
from app.services.notification_service import (
    get_notification_service,
    schedule_notification,
)
from app.services.notification_templates import TEMPLATE_PASSWORD_RESET

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


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
):
    """
    Initiate password recovery.
    Dispatches a reset link with a 15-minute token if the email exists.
    Returns a generic message regardless of email existence to prevent user enumeration.
    """
    logger.info("auth.forgot_password request received")
    normalized_email = sanitize_email(payload.email)
    role = payload.role.strip().lower()

    if role not in (CUSTOMER, "customer", RESTAURANT_OWNER, "restaurant_owner", DELIVERY_PARTNER, "delivery_partner"):
        raise HTTPException(status_code=400, detail="Invalid role specified for password recovery")

    # Map role to collection
    target_collection = "users"
    name_field = "name"
    if role in (RESTAURANT_OWNER, "restaurant_owner"):
        target_collection = "restaurant_owners"
        name_field = "owner_name"
    elif role in (DELIVERY_PARTNER, "delivery_partner"):
        target_collection = "delivery_partners"
        name_field = "name"

    account = await database[target_collection].find_one({"email": normalized_email})

    if account:
        token = create_password_reset_token(email=normalized_email, role=role)
        # Determine frontend URL
        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_base}/reset-password?token={token}&role={role}"

        customer_name = account.get(name_field) or "User"
        notification_service = get_notification_service()
        schedule_notification(
            background_tasks,
            notification_service.send,
            customer_id=str(account.get("_id")),
            notification_type=TEMPLATE_PASSWORD_RESET,
            context={
                "customer_name": customer_name,
                "reset_link": reset_link,
            },
            recipient_email=normalized_email,
        )
        logger.info(f"auth.forgot_password reset link scheduled for {normalized_email}")

    return {
        "message": "If an account exists with this email, a password reset link has been sent."
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """
    Reset password using a valid reset token.
    """
    logger.info("auth.reset_password request received")

    token_data = decode_password_reset_token(payload.token)
    if not token_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password reset token",
        )

    email = token_data.get("sub")
    role = (payload.role or token_data.get("role") or "customer").strip().lower()

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Invalid token payload",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long",
        )

    target_collection = "users"
    if role in (RESTAURANT_OWNER, "restaurant_owner"):
        target_collection = "restaurant_owners"
    elif role in (DELIVERY_PARTNER, "delivery_partner"):
        target_collection = "delivery_partners"

    new_hash = hash_password(payload.new_password)
    result = await database[target_collection].update_one(
        {"email": email},
        {"$set": {"password": new_hash}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    logger.info(f"auth.reset_password succeeded for {email}")
    return {
        "message": "Password reset successfully. You can now log in with your new password."
    }

