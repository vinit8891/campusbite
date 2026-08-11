from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, DELIVERY_PARTNER
from app.models.delivery_partner import (
    update_status,
    get_status,
)

router = APIRouter(
    prefix="/delivery-partner",
    tags=["Delivery Partner"],
)


@router.put("/status")
async def change_status(
    data: dict,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    phone = current_user.get("phone") or data.get("phone")

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Phone is required",
        )

    assert_same_identity(current_user, phone=phone)

    if "online" not in data:
        raise HTTPException(
            status_code=400,
            detail="online status is required",
        )

    await update_status(
        phone,
        data["online"],
    )

    return {
        "message": "Status Updated"
    }


@router.get("/status/{phone}")
async def status(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    assert_same_identity(current_user, phone=phone)
    return await get_status(phone)
