from fastapi import APIRouter

from app.models.delivery_partner import (
    update_status,
    get_status,
)

router = APIRouter(
    prefix="/delivery-partner",
    tags=["Delivery Partner"],
)


@router.put("/status")
async def change_status(data: dict):
    await update_status(
        data["phone"],
        data["online"],
    )

    return {
        "message": "Status Updated"
    }


@router.get("/status/{phone}")
async def status(phone: str):
    return await get_status(phone)