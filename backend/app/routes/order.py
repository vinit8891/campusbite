import random
from datetime import datetime, UTC
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import (
    ADMIN,
    CUSTOMER,
    DELIVERY_PARTNER,
    RESTAURANT_OWNER,
)
from app.schemas.order import Order

from app.models.order import (
    create_order,
    get_order_by_id,
    get_orders,
    get_customer_orders,
    get_my_customer_orders,
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

RESTAURANT_STATUSES = {
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Cancelled",
}

DELIVERY_STATUSES = {
    "Assigned",
    "Picked Up",
    "Out for Delivery",
}


def _owner_email(user: dict) -> str | None:
    return user.get("email") or (
        user.get("sub") if user.get("role") == RESTAURANT_OWNER else None
    )


def _customer_owns_order(order: dict, user: dict) -> bool:
    """Prefer customer_id/email from JWT; fall back to phone for legacy orders."""
    customer_id = user.get("sub")
    if (
        customer_id
        and order.get("customer_id")
        and str(order.get("customer_id")) == str(customer_id)
    ):
        return True

    token_email = user.get("email")
    if (
        token_email
        and order.get("customer_email")
        and str(token_email).lower()
        == str(order.get("customer_email")).lower()
    ):
        return True

    token_phone = user.get("phone")
    if token_phone and str(token_phone) == str(order.get("phone")):
        return True

    return False


def _assert_order_access(order: dict, user: dict):
    """Allow customer owner, restaurant owner, assigned delivery partner, or admin."""
    role = user.get("role")

    if role == ADMIN:
        return

    if role == CUSTOMER:
        if not _customer_owns_order(order, user):
            raise HTTPException(
                status_code=403,
                detail="You can only access your own orders",
            )
        return

    if role == RESTAURANT_OWNER:
        email = _owner_email(user)
        if not email or email.lower() != str(order.get("restaurant_email", "")).lower():
            raise HTTPException(
                status_code=403,
                detail="You can only access orders for your restaurant",
            )
        return

    if role == DELIVERY_PARTNER:
        partner = order.get("delivery_partner") or {}
        token_phone = user.get("phone")
        if token_phone and str(partner.get("phone")) == str(token_phone):
            return
        raise HTTPException(
            status_code=403,
            detail="You can only access orders assigned to you",
        )

    raise HTTPException(
        status_code=403,
        detail="Insufficient permissions",
    )


@router.post("/")
async def add_order(
    order: Order,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    data = order.model_dump()

    customer_id = current_user.get("sub")
    customer_email = current_user.get("email")
    token_phone = current_user.get("phone")

    if not customer_id or not token_phone:
        raise HTTPException(
            status_code=400,
            detail="Customer identity is incomplete. Please log in again.",
        )

    # Always bind ownership to authenticated customer
    data["customer_id"] = str(customer_id)
    data["customer_email"] = customer_email
    data["customer_name"] = (
        current_user.get("full_name") or data.get("customer_name")
    )

    # Self orders must use JWT phone. Someone-else keeps recipient phone
    # but ownership remains via customer_id/email.
    if data.get("delivery_for") != "someone_else":
        data["phone"] = token_phone
    elif not data.get("phone"):
        data["phone"] = token_phone

    if not data.get("restaurant_email"):
        raise HTTPException(
            status_code=400,
            detail="restaurant_email is required",
        )

    data["status"] = "Pending"
    data["delivery_otp"] = random.randint(1000, 9999)
    data["otp_verified"] = False
    data["review_submitted"] = False
    data["created_at"] = datetime.now(UTC)

    order_id = await create_order(data)

    return {
        "message": "Order placed successfully",
        "id": order_id,
    }


@router.get("/")
async def fetch_orders(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    return await get_orders()


@router.get("/my")
async def my_orders(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    return await get_my_customer_orders(
        customer_id=current_user.get("sub"),
        phone=current_user.get("phone"),
        email=current_user.get("email"),
    )


@router.get("/customer/{phone}")
async def customer_orders(
    phone: str,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER, ADMIN))],
):
    assert_same_identity(current_user, phone=phone)
    return await get_customer_orders(phone)


@router.get("/restaurant/{email}")
async def restaurant_orders(
    email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    assert_same_identity(current_user, email=email)
    return await get_restaurant_orders(email)


@router.get("/delivery/available")
async def available_orders(
    _: Annotated[dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))],
):
    return await get_available_orders()


@router.get("/delivery/history")
async def delivery_history(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    if current_user.get("role") == ADMIN:
        return await get_delivered_orders()

    phone = current_user.get("phone")
    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Delivery partner phone missing from token",
        )

    return await get_delivery_orders(phone)


@router.get("/delivery/my/{phone}")
async def my_delivery_orders(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    assert_same_identity(current_user, phone=phone)
    return await get_delivery_orders(phone)


@router.put("/delivery/accept/{order_id}")
async def accept_delivery(
    order_id: str,
    current_user: Annotated[dict, Depends(require_roles(DELIVERY_PARTNER))],
    partner: dict | None = Body(default=None),
):
    # Always use authenticated partner identity — never trust client body identity
    partner_name = current_user.get("name")
    partner_phone = current_user.get("phone")
    partner_vehicle = current_user.get("vehicle") or (
        (partner or {}).get("vehicle") if partner else ""
    ) or ""

    if not partner_name or not partner_phone:
        raise HTTPException(
            status_code=400,
            detail="Delivery partner identity is incomplete. Please log in again.",
        )

    success = await assign_delivery_partner(
        order_id=order_id,
        partner_name=partner_name,
        partner_phone=partner_phone,
        partner_vehicle=partner_vehicle,
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="This order has already been accepted by another delivery partner or is no longer available.",
        )

    return {
        "success": True,
        "message": "Order accepted successfully",
    }


@router.put("/assign-delivery/{order_id}")
async def assign_delivery(
    order_id: str,
    partner_name: str,
    partner_phone: str,
    _: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
):
    success = await assign_delivery_partner(
        order_id,
        partner_name,
        partner_phone,
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Unable to assign delivery partner for this order.",
        )

    return {
        "message": "Delivery Partner Assigned Successfully"
    }


@router.put("/delivery/location/{order_id}")
async def update_location(
    order_id: str,
    current_user: Annotated[dict, Depends(require_roles(DELIVERY_PARTNER))],
    location: dict = Body(...),
):
    order = await get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    partner = order.get("delivery_partner") or {}
    token_phone = current_user.get("phone")
    if not token_phone or str(partner.get("phone")) != str(token_phone):
        raise HTTPException(
            status_code=403,
            detail="You can only update location for your assigned orders",
        )

    latitude = location.get("latitude")
    longitude = location.get("longitude")

    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Latitude and Longitude are required.",
        )

    updated = await update_delivery_location(
        order_id,
        latitude,
        longitude,
    )

    if not updated:
        raise HTTPException(
            status_code=400,
            detail="Unable to update location for this order status.",
        )

    return {
        "message": "Delivery Location Updated"
    }


@router.get("/delivery/location/{order_id}")
async def get_location(
    order_id: str,
    current_user: Annotated[
        dict,
        Depends(
            require_roles(
                CUSTOMER,
                RESTAURANT_OWNER,
                DELIVERY_PARTNER,
                ADMIN,
            )
        ),
    ],
):
    order = await get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    _assert_order_access(order, current_user)
    return await get_delivery_location(order_id)


@router.get("/otp/{order_id}")
async def get_otp(
    order_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(CUSTOMER, RESTAURANT_OWNER, ADMIN))
    ],
):
    order = await get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    role = current_user.get("role")

    if role == CUSTOMER:
        if not _customer_owns_order(order, current_user):
            raise HTTPException(
                status_code=403,
                detail="You can only view OTP for your own orders",
            )
    elif role == RESTAURANT_OWNER:
        email = _owner_email(current_user)
        if (
            not email
            or email.lower()
            != str(order.get("restaurant_email", "")).lower()
        ):
            raise HTTPException(
                status_code=403,
                detail="You can only view OTP for your restaurant orders",
            )

    otp = await get_order_otp(order_id)

    if not otp:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return otp


@router.put("/verify-otp/{order_id}")
async def verify_otp(
    order_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    body: dict = Body(...),
):
    order = await get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if current_user.get("role") == DELIVERY_PARTNER:
        partner = order.get("delivery_partner") or {}
        token_phone = current_user.get("phone")
        if not token_phone or str(partner.get("phone")) != str(token_phone):
            raise HTTPException(
                status_code=403,
                detail="You can only verify OTP for your assigned orders",
            )

    if order.get("status") == "Delivered" or order.get("otp_verified"):
        raise HTTPException(
            status_code=400,
            detail="Order is already delivered.",
        )

    if order.get("status") != "Out for Delivery":
        raise HTTPException(
            status_code=400,
            detail="OTP can only be verified when order is Out for Delivery.",
        )

    otp = body.get("otp")

    if otp is None:
        raise HTTPException(
            status_code=400,
            detail="OTP is required.",
        )

    success = await verify_delivery_otp(
        order_id,
        otp,
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    return {
        "success": True,
        "message": "OTP Verified",
    }


@router.get("/{order_id}")
async def fetch_order(
    order_id: str,
    current_user: Annotated[
        dict,
        Depends(
            require_roles(
                CUSTOMER,
                RESTAURANT_OWNER,
                DELIVERY_PARTNER,
                ADMIN,
            )
        ),
    ],
):
    order = await get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    # Never expose OTP on the generic order detail endpoint
    response = dict(order)
    response.pop("delivery_otp", None)

    _assert_order_access(order, current_user)
    return response


@router.put("/{order_id}/{status}")
async def change_status(
    order_id: str,
    status: str,
    current_user: Annotated[
        dict,
        Depends(
            require_roles(
                RESTAURANT_OWNER,
                DELIVERY_PARTNER,
                ADMIN,
            )
        ),
    ],
):
    if status not in VALID_STATUS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {', '.join(VALID_STATUS)}",
        )

    order = await get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    role = current_user.get("role")

    if role == RESTAURANT_OWNER:
        email = _owner_email(current_user)
        if (
            not email
            or email.lower()
            != str(order.get("restaurant_email", "")).lower()
        ):
            raise HTTPException(
                status_code=403,
                detail="You can only update orders for your restaurant",
            )
        if status not in RESTAURANT_STATUSES:
            raise HTTPException(
                status_code=403,
                detail="Restaurant owners cannot set this status",
            )

    elif role == DELIVERY_PARTNER:
        partner = order.get("delivery_partner") or {}
        token_phone = current_user.get("phone")
        if not token_phone or str(partner.get("phone")) != str(token_phone):
            raise HTTPException(
                status_code=403,
                detail="You can only update orders assigned to you",
            )
        if status not in DELIVERY_STATUSES:
            raise HTTPException(
                status_code=403,
                detail="Delivery partners cannot set this status",
            )

    updated = await update_order_status(
        order_id,
        status,
    )

    if not updated:
        raise HTTPException(
            status_code=400,
            detail="Invalid status transition for this order.",
        )

    return {
        "success": True,
        "status": status,
        "message": "Order status updated successfully.",
    }
