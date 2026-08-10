from fastapi import APIRouter, HTTPException
from app.db.database import database

router = APIRouter(
    prefix="/delivery-dashboard",
    tags=["Delivery Dashboard"],
)

orders = database["orders"]


@router.get("/stats/{phone}")
async def delivery_stats(phone: str):

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Delivery partner phone is required",
        )

    # ==========================================
    # Partner's orders
    # ==========================================

    partner_orders = orders.find({
        "delivery_partner.phone": phone
    })

    pending = 0
    completed = 0
    earnings = 0

    async for order in partner_orders:

        status = order.get("status")

        # Orders still being handled
        if status in [
            "Assigned",
            "Accepted",
            "Picked Up",
            "Out for Delivery",
        ]:
            pending += 1

        # Completed deliveries
        elif status == "Delivered":
            completed += 1

            # Current CampusBite delivery earning
            earnings += 50

    return {
        "phone": phone,
        "pending": pending,
        "completed": completed,
        "earnings": earnings,
        "rating": 4.9,
    }