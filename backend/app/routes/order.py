from fastapi import APIRouter, Body

from app.schemas.order import Order

from app.models.order import (
    create_order,
    get_orders,
    get_customer_orders,
    get_restaurant_orders,
    get_available_orders,
    get_delivered_orders,
    get_delivery_orders,
    update_order_status,
    assign_delivery_partner,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


# -----------------------------
# Place New Order
# -----------------------------
@router.post("/")
async def add_order(order: Order):

    order_id = await create_order(
        order.model_dump()
    )

    return {
        "message": "Order placed successfully",
        "id": order_id,
    }


# -----------------------------
# Get All Orders (Admin)
# -----------------------------
@router.get("/")
async def fetch_orders():
    return await get_orders()


# -----------------------------
# Get Customer Orders
# -----------------------------
@router.get("/customer/{phone}")
async def customer_orders(phone: str):
    return await get_customer_orders(phone)


# -----------------------------
# Get Restaurant Orders
# -----------------------------
@router.get("/restaurant/{email}")
async def restaurant_orders(email: str):
    return await get_restaurant_orders(email)


# -----------------------------
# Get Available Orders (Delivery)
# -----------------------------
@router.get("/delivery/available")
async def available_orders():
    return await get_available_orders()


# -----------------------------
# Delivery History
# -----------------------------
@router.get("/delivery/history")
async def delivery_history():
    return await get_delivered_orders()


# -----------------------------
# Delivery Partner Orders
# -----------------------------
@router.get("/delivery/my/{phone}")
async def my_delivery_orders(phone: str):
    return await get_delivery_orders(phone)


# -----------------------------
# Delivery Partner Accept Order
# -----------------------------
@router.put("/delivery/accept/{order_id}")
async def accept_delivery(
    order_id: str,
    partner: dict = Body(...)
):
    await update_order_status(
        order_id,
        "Assigned",
        partner,
    )

    return {
        "message": "Delivery Assigned"
    }


# -----------------------------
# Assign Delivery Partner
# -----------------------------
@router.put("/assign-delivery/{order_id}")
async def assign_delivery(
    order_id: str,
    partner_name: str,
    partner_phone: str,
):
    await assign_delivery_partner(
        order_id,
        partner_name,
        partner_phone,
    )

    return {
        "message": "Delivery Partner Assigned Successfully"
    }


# -----------------------------
# Update Order Status
# -----------------------------
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