import random
from datetime import datetime, UTC

from fastapi import APIRouter, Body, HTTPException

from app.schemas.order import Order

from app.models.order import (
    create_order,
    get_order_by_id,
    get_orders,
    get_customer_orders,
    get_restaurant_orders,
    get_available_orders,
    get_delivered_orders,
    get_delivery_orders,
    update_order_status,
    assign_delivery_partner,
    update_delivery_location,
    get_delivery_location,
    get_order_otp,
    verify_delivery_otp,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)

VALID_STATUS = [
    "Pending",
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Assigned",
    "Picked Up",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
]


# -----------------------------
# Place New Order
# -----------------------------
@router.post("/")
async def add_order(order: Order):
    data = order.model_dump()

    # Always start new orders as Pending
    data["status"] = "Pending"

    # Generate Delivery OTP
    data["delivery_otp"] = random.randint(1000, 9999)

    # OTP not verified initially
    data["otp_verified"] = False

    # Review not submitted initially
    data["review_submitted"] = False

    # Order creation time (UTC)
    data["created_at"] = datetime.now(UTC)

    order_id = await create_order(data)

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
# Get Single Order
# -----------------------------
@router.get("/{order_id}")
async def fetch_order(order_id: str):
    order = await get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return order

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
    partner: dict = Body(...),
):
    success = await assign_delivery_partner(
        order_id=order_id,
        partner_name=partner.get("name", ""),
        partner_phone=partner.get("phone", ""),
        partner_vehicle=partner.get("vehicle", ""),
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="This order has already been accepted by another delivery partner or is no longer available."
        )

    return {
        "success": True,
        "message": "Order accepted successfully"
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

# =====================================================
# LIVE DELIVERY TRACKING
# =====================================================

# -----------------------------
# Update Delivery Partner Location
# -----------------------------
@router.put("/delivery/location/{order_id}")
async def update_location(
    order_id: str,
    location: dict = Body(...),
):
    latitude = location.get("latitude")
    longitude = location.get("longitude")

    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Latitude and Longitude are required."
        )

    await update_delivery_location(
        order_id,
        latitude,
        longitude,
    )

    return {
        "message": "Delivery Location Updated"
    }


# -----------------------------
# Get Live Delivery Location
# -----------------------------
@router.get("/delivery/location/{order_id}")
async def get_location(
    order_id: str,
):
    return await get_delivery_location(order_id)


# =====================================================
# DELIVERY OTP
# =====================================================

# -----------------------------
# Get Delivery OTP
# -----------------------------
@router.get("/otp/{order_id}")
async def get_otp(
    order_id: str,
):
    otp = await get_order_otp(order_id)

    if not otp:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return otp

# -----------------------------
# Verify Delivery OTP
# -----------------------------
@router.put("/verify-otp/{order_id}")
async def verify_otp(
    order_id: str,
    body: dict = Body(...),
):
    print("===== VERIFY ROUTE HIT =====")
    print("Order ID:", order_id)
    print("Body:", body)

    otp = body.get("otp")

    if otp is None:
        raise HTTPException(
            status_code=400,
            detail="OTP is required."
        )

    success = await verify_delivery_otp(
        order_id,
        otp,
    )

    print("Verification Result:", success)

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    return {
        "success": True,
        "message": "OTP Verified",
    }

# =====================================================
# Update Order Status
# =====================================================

@router.put("/{order_id}/{status}")
async def change_status(
    order_id: str,
    status: str,
):
    if status not in VALID_STATUS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {', '.join(VALID_STATUS)}",
        )

    updated = await update_order_status(
        order_id,
        status,
    )

    if updated == 0:
        raise HTTPException(
            status_code=404,
            detail="Order not updated",
        )

    return {
        "success": True,
        "status": status,
        "message": "Order status updated successfully.",
    }