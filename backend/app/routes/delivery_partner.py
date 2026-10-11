from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, DELIVERY_PARTNER
from app.core.logging import get_logger
from app.models.delivery_partner import (
    get_delivery_partner_by_email,
    get_delivery_partner_by_id,
    get_delivery_partner_by_phone,
    get_status,
    serialize_partner_profile,
    update_delivery_partner_profile,
    update_status,
)
from app.schemas.delivery_partner import DeliveryPartnerProfileUpdate

router = APIRouter(
    prefix="/delivery-partner",
    tags=["Delivery Partner"],
)

logger = get_logger(__name__)


def _resolve_partner(current_user: dict):
    phone = current_user.get("phone")
    if phone:
        return get_delivery_partner_by_phone(phone)

    email = current_user.get("email")
    if email:
        return get_delivery_partner_by_email(email)

    sub = current_user.get("sub")
    if sub:
        return get_delivery_partner_by_id(str(sub))

    return None


@router.get("/me")
async def get_my_profile(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    logger.info("delivery_partner.profile.get request received")
    partner = await _resolve_partner(current_user)

    if not partner:
        raise HTTPException(
            status_code=404,
            detail="Delivery partner profile not found",
        )

    assert_same_identity(
        current_user,
        phone=partner.get("phone"),
    )

    profile = serialize_partner_profile(partner)
    logger.info("delivery_partner.profile.get completed successfully")
    return profile


@router.put("/me")
async def update_my_profile(
    payload: DeliveryPartnerProfileUpdate,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER))
    ],
):
    logger.info("delivery_partner.profile.update request received")
    partner = await _resolve_partner(current_user)

    if not partner:
        raise HTTPException(
            status_code=404,
            detail="Delivery partner profile not found",
        )

    phone = partner.get("phone")
    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Delivery partner phone is missing",
        )

    assert_same_identity(current_user, phone=phone)

    raw = payload.model_dump(exclude_unset=True)

    # Map vehicle_type alias onto existing vehicle field
    if "vehicle_type" in raw and raw.get("vehicle") is None:
        raw["vehicle"] = raw.get("vehicle_type")
    raw.pop("vehicle_type", None)

    # Phone/email/auth/IDs are never accepted from this payload
    data = {
        key: value
        for key, value in raw.items()
        if key in {"name", "vehicle", "vehicle_number", "profile_image", "online"}
        and value is not None
    }

    if "name" in data and not str(data["name"]).strip():
        raise HTTPException(status_code=400, detail="Name is required")

    if "vehicle" in data and not str(data["vehicle"]).strip():
        raise HTTPException(status_code=400, detail="Vehicle type is required")

    if "vehicle_number" in data and not str(data["vehicle_number"]).strip():
        raise HTTPException(
            status_code=400,
            detail="Vehicle number is required",
        )

    if "name" in data:
        data["name"] = str(data["name"]).strip()
    if "vehicle" in data:
        data["vehicle"] = str(data["vehicle"]).strip()
    if "vehicle_number" in data:
        data["vehicle_number"] = str(data["vehicle_number"]).strip()
    if "profile_image" in data:
        data["profile_image"] = str(data["profile_image"]).strip()

    if not data:
        raise HTTPException(
            status_code=400,
            detail="No profile fields to update",
        )

    updated = await update_delivery_partner_profile(phone, data)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Delivery partner profile not found",
        )

    refreshed = await get_delivery_partner_by_phone(phone)
    logger.info("delivery_partner.profile.update completed successfully")
    return {
        "message": "Profile updated successfully",
        "partner": serialize_partner_profile(refreshed),
    }


@router.put("/status")
@router.put("/duty")
async def change_status(
    data: dict,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    logger.info("delivery_partner.status.update request received")
    phone = current_user.get("phone") or data.get("phone")

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Phone is required",
        )

    assert_same_identity(current_user, phone=phone)

    partner = await _resolve_partner(current_user)
    if not partner and phone:
        partner = await get_delivery_partner_by_phone(phone)

    if current_user.get("role") == DELIVERY_PARTNER:
        is_approved = (
            partner is not None
            and (
                partner.get("verification_status") in ("approved", "APPROVED")
                or partner.get("is_verified") is True
            )
            and partner.get("verification_status") not in ("pending", "PENDING_VERIFICATION", "rejected", "REJECTED", "suspended", "SUSPENDED")
        )
        if not is_approved:
            raise HTTPException(
                status_code=403,
                detail="Courier account is pending verification and cannot toggle duty status.",
            )

    is_on = data.get("online")
    if is_on is None:
        is_on = data.get("is_on_duty")
    if is_on is None and "status" in data:
        is_on = data["status"] in ("on", "online", "on_duty", True)

    if is_on is None:
        raise HTTPException(
            status_code=400,
            detail="online or is_on_duty status is required",
        )

    is_on_bool = bool(is_on)
    await update_status(
        phone,
        is_on_bool,
    )

    logger.info("delivery_partner.status.update completed successfully")
    return {
        "message": "Status Updated",
        "online": is_on_bool,
        "is_on_duty": is_on_bool,
    }


@router.get("/status/{phone}")
async def status(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    logger.info("delivery_partner.status.get request received")
    assert_same_identity(current_user, phone=phone)
    result = await get_status(phone)
    logger.info("delivery_partner.status.get completed successfully")
    return result
