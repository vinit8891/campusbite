from fastapi import APIRouter, HTTPException

from app.auth.roles import DELIVERY_PARTNER
from app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.core.logging import get_logger

from app.models.delivery_partner import (
    create_delivery_partner,
    get_delivery_partner_by_email,
    get_delivery_partner_by_phone,
)

from app.schemas.delivery_partner import DeliveryPartner


router = APIRouter(
    prefix="/delivery",
    tags=["Delivery Authentication"],
)

logger = get_logger(__name__)


# ==========================================
# Delivery Partner Registration
# ==========================================

@router.post("/register")
async def register_delivery_partner(
    partner: DeliveryPartner
):
    logger.info("delivery.register request received")
    existing_email = (
        await get_delivery_partner_by_email(
            partner.email
        )
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    existing_phone = (
        await get_delivery_partner_by_phone(
            partner.phone
        )
    )

    if existing_phone:
        raise HTTPException(
            status_code=400,
            detail="Phone already registered",
        )

    partner_data = partner.model_dump()

    partner_data["password"] = hash_password(
        partner.password
    )

    partner_id = await create_delivery_partner(
        partner_data
    )

    logger.info("delivery.register completed successfully")
    return {
        "success": True,
        "message": "Delivery partner registered successfully",
        "id": partner_id,
    }


# ==========================================
# Delivery Partner Login
# ==========================================

@router.post("/login")
async def login_delivery_partner(
    data: dict
):
    logger.info("delivery.login request received")
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail="Email and password are required",
        )

    partner = (
        await get_delivery_partner_by_email(
            email
        )
    )

    if not partner:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        password,
        partner["password"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = create_access_token(
        {
            "sub": str(partner["_id"]),
            "email": partner["email"],
            "name": partner["name"],
            "phone": partner["phone"],
            "vehicle": partner.get("vehicle"),
            "role": DELIVERY_PARTNER,
        }
    )

    logger.info("delivery.login completed successfully")
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "partner": {
            "id": str(partner["_id"]),
            "name": partner["name"],
            "email": partner["email"],
            "phone": partner["phone"],
            "vehicle": partner["vehicle"],
            "vehicle_number": partner["vehicle_number"],
        },
    }
