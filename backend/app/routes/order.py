from fastapi import APIRouter

from app.schemas.order import Order

from app.models.order import (
    create_order,
    get_orders,
    get_restaurant_orders,
    update_order_status,
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


@router.get("/restaurant/{email}")
async def restaurant_orders(email: str):
    return await get_restaurant_orders(email)


@router.put("/{order_id}/{status}")
async def change_status(
    order_id: str,
    status: str,
):
    await update_order_status(
        order_id,
        status,
    )

    return {
        "message": "Status Updated"
    }