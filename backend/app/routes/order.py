from fastapi import APIRouter

from app.schemas.order import Order
from app.models.order import (
    create_order,
    get_orders,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)

@router.post("/")
async def add_order(order: Order):

    order_id = await create_order(
        order.model_dump()
    )

    return {
        "message": "Order placed successfully",
        "id": order_id,
    }

@router.get("/")
async def fetch_orders():
    return await get_orders()