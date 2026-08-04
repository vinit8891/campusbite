from fastapi import APIRouter

from app.schemas.delivery_partner import DeliveryPartner
from app.models.delivery_partner import (
    register_partner,
    login_partner,
)

router = APIRouter(
    prefix="/delivery",
    tags=["Delivery Partner"],
)


@router.post("/register")
async def register(data: DeliveryPartner):

    partner = data.model_dump()

    partner["available"] = True
    partner["earnings"] = 0

    partner_id = await register_partner(partner)

    return {
        "message": "Partner Registered",
        "id": partner_id,
    }


@router.post("/login")
async def login(data: dict):

    partner = await login_partner(
        data["email"],
        data["password"],
    )

    if not partner:
        return {
            "success": False,
        }

    partner["_id"] = str(partner["_id"])

    return {
        "success": True,
        "partner": partner,
    }