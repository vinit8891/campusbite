from fastapi import APIRouter
from app.db.database import database

router = APIRouter(
    prefix="/delivery-dashboard",
    tags=["Delivery Dashboard"],
)

orders = database["orders"]


@router.get("/stats")
async def delivery_stats():

    pending = await orders.count_documents({
        "status": {
            "$in": [
                "Accepted",
                "Picked Up",
                "Out for Delivery"
            ]
        }
    })

    completed = await orders.count_documents({
        "status": "Delivered"
    })

    delivered_orders = orders.find({
        "status": "Delivered"
    })

    earnings = 0

    async for order in delivered_orders:
        earnings += 50

    return {
        "pending": pending,
        "completed": completed,
        "earnings": earnings,
        "rating": 4.9
    }