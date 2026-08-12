from fastapi import APIRouter, HTTPException, Request

from app.schemas.restaurant_owner import RestaurantOwner
from app.models.restaurant_owner import (
    create_restaurant_owner,
    get_owner_by_email,
)

from app.auth.roles import RESTAURANT_OWNER
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.core.brute_force import login_guard
from app.core.logging import get_logger
from app.core.rate_limit import client_ip
from app.core.sanitize import sanitize_email

router = APIRouter(
    prefix="/restaurant-owner",
    tags=["Restaurant Owner"],
)

logger = get_logger(__name__)


@router.post("/register")
async def register_owner(owner: RestaurantOwner):
    logger.info("restaurant_owner.register request received")

    existing = await get_owner_by_email(
        owner.email
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    data = owner.model_dump()

    data["password"] = hash_password(
        owner.password
    )

    owner_id = await create_restaurant_owner(
        data
    )

    logger.info("restaurant_owner.register completed successfully")
    return {
        "message": "Restaurant Owner Registered",
        "id": owner_id,
    }


@router.post("/login")
async def login_owner(data: dict, request: Request):
    logger.info("restaurant_owner.login request received")

    email = sanitize_email(data.get("email")) or ""
    password = data.get("password")
    ip = client_ip(request)
    login_guard.assert_not_blocked(ip, email)

    owner = await get_owner_by_email(
        email
    )

    if not owner:
        login_guard.record_failure(ip, email)
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    if not verify_password(
        password,
        owner["password"],
    ):
        login_guard.record_failure(ip, email)
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    login_guard.record_success(ip, email)

    token = create_access_token(
        {
            "sub": owner["email"],
            "email": owner["email"],
            "phone": owner.get("phone"),
            "owner_name": owner.get("owner_name"),
            "restaurant_name": owner.get("restaurant_name"),
            "role": RESTAURANT_OWNER,
        }
    )

    logger.info("restaurant_owner.login completed successfully")
    return {
        "access_token": token,
        "token_type": "bearer",
        "owner_name": owner["owner_name"],
        "restaurant_name": owner["restaurant_name"],
        "email": owner["email"],
    }
