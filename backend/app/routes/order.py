import random
from datetime import datetime, UTC
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query

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
    emergency_deliver_order,
    canonicalize_status,
    can_transition_to,
    DISPLAY_STATUS_MAP,
    STATUS_NORMALIZATION_MAP,
)
from app.services.notification_service import (
    notify_delivery_assigned,
    notify_order_accepted,
    notify_order_delivered,
    notify_order_placed,
    schedule_notification,
)
from app.db.database import database
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email, sanitize_search_query
from app.models.delivery_partner import get_delivery_partner_by_phone
from app.payments.amounts import (
    RIDER_COD_BALANCE_CEILING,
    assert_client_total_matches,
    calculate_order_amounts,
    calculate_payable_amount,
    to_paise,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)

logger = get_logger(__name__)

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


COD_METHOD = "cod"
ONLINE_METHOD = "online"
COD_ALIASES = {
    "cod",
    "cash_on_delivery",
    "cashondelivery",
    "cash",
}
ONLINE_ALIASES = {
    "online",
    "online_payment",
    "upi",
    "card",
    "net_banking",
    "razorpay",
    "stripe",
}


def _normalize_payment_key(value: str | None) -> str:
    if not value:
        return ""
    return (
        str(value)
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )


def _is_cod_method(value: str | None) -> bool:
    key = _normalize_payment_key(value)
    if not key:
        return True
    if key in COD_ALIASES:
        return True
    return "cash" in key


def _is_online_method(value: str | None) -> bool:
    key = _normalize_payment_key(value)
    return key in ONLINE_ALIASES or key == ONLINE_METHOD


def _apply_payment_defaults(order: dict) -> dict:
    """Safe response defaults for orders missing payment fields or delivered COD orders."""
    response = dict(order)
    method = response.get("payment_method")
    status = str(response.get("status", "")).strip().title()
    payment_status = str(response.get("payment_status", "")).strip().lower()

    if _is_cod_method(method) and not _is_online_method(method):
        response["payment_method"] = COD_METHOD
        # If delivered or already marked paid/completed, reflect paid status
        if status == "Delivered" or payment_status in ["paid", "completed"]:
            response["payment_status"] = "paid"
        else:
            response["payment_status"] = response.get("payment_status") or "pending"
    elif _is_online_method(method):
        response["payment_method"] = ONLINE_METHOD
        if not response.get("payment_status"):
            response["payment_status"] = "pending"
    else:
        if not method:
            response["payment_method"] = COD_METHOD
        if status == "Delivered" or payment_status in ["paid", "completed"]:
            response["payment_status"] = "paid"
        elif not response.get("payment_status"):
            response["payment_status"] = "pending"

    return response


def _public_order(order: dict) -> dict:
    """Order payload for clients: payment defaults, never expose OTP/secrets."""
    response = _apply_payment_defaults(order)
    response.pop("delivery_otp", None)
    # Signature is verification material — do not expose on generic APIs
    response.pop("razorpay_signature", None)

    for date_key in ("created_at", "delivered_at", "paid_at", "accepted_at", "ready_at"):
        val = response.get(date_key)
        if isinstance(val, datetime):
            if val.tzinfo is None:
                val = val.replace(tzinfo=UTC)
            response[date_key] = val.isoformat()

    return response


def _public_orders(orders: list) -> list:
    return [_public_order(order) for order in orders]


def _public_paginated(result) -> dict | list:
    """Serialize list or paginated order payloads."""
    if isinstance(result, list):
        return _public_orders(result)
    raw_items = result.get("items")
    if isinstance(raw_items, list):
        items = raw_items
    elif isinstance(raw_items, dict) and raw_items.get("_id"):
        items = [raw_items]
    else:
        items = []
    return {
        **result,
        "items": _public_orders(items),
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
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info("orders.create request received")
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

    raw_method = data.get("payment_method")
    is_online = _is_online_method(raw_method)
    method_for_calc = "ONLINE" if is_online else "COD"
    delivery_type = data.get("delivery_type") or "HOSTEL_BATCH"
    tip_amount = float(data.get("tip_amount") or 0.0)

    # Authoritative statutory pricing from items & parameters — never trust client amount alone
    pricing = calculate_order_amounts(
        items=data.get("items") or [],
        delivery_type=delivery_type,
        tip_amount=tip_amount,
        payment_method=method_for_calc,
    )
    server_total = pricing["total_payable"]
    assert_client_total_matches(data.get("total"), server_total)
    data["total"] = server_total
    data["amount_paise"] = to_paise(server_total)
    data["pricing_breakdown"] = pricing
    data["delivery_type"] = delivery_type
    data["hostel_block"] = data.get("hostel_block")
    data["tip_amount"] = tip_amount

    if is_online:
        data["payment_method"] = ONLINE_METHOD
        data["payment_status"] = "pending"
        data["razorpay_order_id"] = None
        data["razorpay_payment_id"] = None
        data["razorpay_signature"] = None
        data["refund_id"] = None
    elif _is_cod_method(raw_method) or not _normalize_payment_key(raw_method):
        data["payment_method"] = COD_METHOD
        data["payment_status"] = "pending"
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported payment method. Use 'cod' or 'online'.",
        )

    # Order lifecycle status remains independent of payment_status
    data["status"] = "Pending"
    data["delivery_otp"] = random.randint(1000, 9999)
    data["failed_otp_attempts"] = 0
    data["otp_verified"] = False
    data["review_submitted"] = False
    data["created_at"] = datetime.now(UTC)

    order_id = await create_order(data)

    schedule_notification(
        background_tasks,
        notify_order_placed,
        order_id,
    )

    logger.info("orders.create completed successfully")
    return {
        "message": "Order placed successfully",
        "id": order_id,
        "payment_method": data["payment_method"],
        "payment_status": data["payment_status"],
        "total": server_total,
        "amount_paise": data["amount_paise"],
    }


@router.get("/")
async def fetch_orders(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    status: Annotated[str | None, Query()] = None,
    payment_status: Annotated[str | None, Query()] = None,
    payment_method: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """Admin order list. Optional filters; newest first. Read-only."""
    return _public_paginated(
        await get_orders(
            status=status,
            payment_status=payment_status,
            payment_method=payment_method,
            q=sanitize_search_query(q),
            page=page,
            limit=limit,
        )
    )


@router.get("/my")
async def my_orders(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    return _public_orders(
        await get_my_customer_orders(
            customer_id=current_user.get("sub"),
            phone=current_user.get("phone"),
            email=current_user.get("email"),
        )
    )


@router.get("/customer/{phone}")
async def customer_orders(
    phone: str,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER, ADMIN))],
):
    assert_same_identity(current_user, phone=phone)
    return _public_orders(await get_customer_orders(phone))


@router.get("/restaurant/{email}")
async def restaurant_orders(
    email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
    status: Annotated[str | None, Query()] = None,
    payment_status: Annotated[str | None, Query()] = None,
    payment_method: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    assert_same_identity(current_user, email=email)
    return _public_orders(
        await get_restaurant_orders(
            email,
            status=status,
            payment_status=payment_status,
            payment_method=payment_method,
            q=sanitize_search_query(q),
            limit=limit,
        )
    )


@router.get("/delivery/available")
async def available_orders(
    _: Annotated[dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))],
    q: Annotated[str | None, Query()] = None,
    restaurant: Annotated[str | None, Query()] = None,
    payment_method: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return _public_paginated(
        await get_available_orders(
            q=sanitize_search_query(q),
            restaurant=restaurant,
            payment_method=payment_method,
            page=page,
            limit=limit,
        )
    )


@router.get("/delivery/history")
async def delivery_history(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    from_date: Annotated[str | None, Query()] = None,
    to_date: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    if current_user.get("role") == ADMIN:
        return _public_paginated(
            await get_delivered_orders(
                from_date=from_date,
                to_date=to_date,
                q=sanitize_search_query(q),
                page=page,
                limit=limit,
            )
        )

    phone = current_user.get("phone")
    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Delivery partner phone missing from token",
        )

    return _public_paginated(
        await get_delivery_orders(
            phone,
            status="Delivered",
            from_date=from_date,
            to_date=to_date,
            q=sanitize_search_query(q),
            page=page,
            limit=limit,
        )
    )


@router.get("/delivery/my/{phone}")
async def my_delivery_orders(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    status: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    assert_same_identity(current_user, phone=phone)
    return _public_orders(
        await get_delivery_orders(
            phone,
            status=status,
            q=sanitize_search_query(q),
            limit=limit,
        )
    )


@router.put("/delivery/accept/{order_id}")
async def accept_delivery(
    order_id: str,
    background_tasks: BackgroundTasks,
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

    target_order = await get_order_by_id(order_id)
    if not target_order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    # Active delivery limit guard: maximum 3 concurrent active deliveries per courier
    active_count = await database["orders"].count_documents(
        {
            "delivery_partner.phone": partner_phone,
            "status": {"$in": ["Assigned", "Picked Up", "Out for Delivery"]},
        }
    )
    if active_count >= 3:
        raise HTTPException(
            status_code=400,
            detail="Active delivery limit reached (max 3 runs). Complete current orders before accepting new ones.",
        )

    # Rider COD floating balance guard: ceiling at ₹1,000
    is_cod_order = (
        _is_cod_method(target_order.get("payment_method"))
        or str(target_order.get("payment_method", "")).lower() == "cod"
    )
    if is_cod_order:
        partner_doc = await get_delivery_partner_by_phone(partner_phone)
        unremitted_balance = float(
            (partner_doc or {}).get("unremitted_cod_balance") or 0.0
        )
        if unremitted_balance >= RIDER_COD_BALANCE_CEILING:
            raise HTTPException(
                status_code=400,
                detail="COD collection limit reached (₹1,000). Please deposit unremitted cash to continue accepting COD orders.",
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

    schedule_notification(
        background_tasks,
        notify_delivery_assigned,
        order_id,
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
    background_tasks: BackgroundTasks,
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

    schedule_notification(
        background_tasks,
        notify_delivery_assigned,
        order_id,
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
    background_tasks: BackgroundTasks,
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

    allowed_otp_statuses = [
        "Assigned",
        "assigned",
        "Picked Up",
        "picked_up",
        "Out for Delivery",
        "out_for_delivery",
        "In Transit",
        "in transit",
    ]
    current_status = order.get("status")
    canonical = canonicalize_status(current_status)

    if (
        current_status not in allowed_otp_statuses
        and canonical not in ["assigned", "picked_up", "out_for_delivery"]
    ):
        raise HTTPException(
            status_code=400,
            detail="OTP can only be verified for active courier deliveries (Assigned, Picked Up, or Out for Delivery).",
        )

    if order.get("failed_otp_attempts", 0) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Order locked for security.",
        )

    otp = body.get("otp")
    if otp is None:
        otp = body.get("delivery_otp")

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
        refreshed = await get_order_by_id(order_id)
        if (refreshed or {}).get("failed_otp_attempts", 0) >= 5:
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. Order locked for security.",
            )
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    # When a COD order is delivered, increment rider's unremitted COD balance
    is_cod_order = (
        _is_cod_method(order.get("payment_method"))
        or str(order.get("payment_method", "")).lower() == "cod"
    )
    if is_cod_order:
        partner_phone = (
            order.get("delivery_partner", {}).get("phone")
            or current_user.get("phone")
        )
        if partner_phone:
            order_total = float(order.get("total") or 0.0)
            await database["delivery_partners"].update_one(
                {"phone": partner_phone},
                {"$inc": {"unremitted_cod_balance": order_total}},
            )

    schedule_notification(
        background_tasks,
        notify_order_delivered,
        order_id,
    )

    return {
        "success": True,
        "message": "OTP Verified",
    }


@router.put("/emergency-deliver/{order_id}")
async def emergency_deliver(
    order_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
    body: dict = Body(...),
):
    reason = str(body.get("reason", "")).strip()
    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Emergency delivery reason is required.",
        )

    order = await get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    role = current_user.get("role")
    actor_email = current_user.get("email") or current_user.get("sub") or "admin"
    if role == RESTAURANT_OWNER:
        email = _owner_email(current_user)
        if (
            not email
            or email.lower()
            != str(order.get("restaurant_email", "")).lower()
        ):
            raise HTTPException(
                status_code=403,
                detail="You can only emergency deliver orders for your restaurant",
            )

    success = await emergency_deliver_order(
        order_id=order_id,
        reason=reason,
        actor_email=actor_email,
    )
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Unable to complete emergency delivery for this order.",
        )

    # Increment COD balance if applicable
    is_cod_order = (
        _is_cod_method(order.get("payment_method"))
        or str(order.get("payment_method", "")).lower() == "cod"
    )
    if is_cod_order:
        partner_phone = order.get("delivery_partner", {}).get("phone")
        if partner_phone:
            order_total = float(order.get("total") or 0.0)
            await database["delivery_partners"].update_one(
                {"phone": partner_phone},
                {"$inc": {"unremitted_cod_balance": order_total}},
            )

    schedule_notification(
        background_tasks,
        notify_order_delivered,
        order_id,
    )

    return {
        "success": True,
        "message": "Emergency delivery completed successfully",
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

    _assert_order_access(order, current_user)
    return _public_order(order)


@router.put("/{order_id}/{status}")
async def change_status(
    order_id: str,
    status: str,
    background_tasks: BackgroundTasks,
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
    normalized_key = (status or "").lower().strip().replace("-", "_")
    normalized_status = (
        STATUS_NORMALIZATION_MAP.get(normalized_key)
        or STATUS_NORMALIZATION_MAP.get(normalized_key.replace("_", " "))
    )
    if normalized_status:
        status = normalized_status

    canonical_target = canonicalize_status(status)
    target_display = (
        normalized_status
        or STATUS_NORMALIZATION_MAP.get(canonical_target)
        or DISPLAY_STATUS_MAP.get(canonical_target, status.strip().title())
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
        if canonical_target not in {"preparing", "ready", "cancelled"}:
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
        if canonical_target not in {"assigned", "picked_up", "out_for_delivery", "delivered"}:
            raise HTTPException(
                status_code=403,
                detail="Delivery partners cannot set this status",
            )

    # Online orders must be paid before kitchen/processing advances
    if canonical_target in {"preparing", "ready"}:
        if (
            order.get("payment_method") == ONLINE_METHOD
            and order.get("payment_status") != "paid"
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Online orders must be paid before restaurant "
                    "processing can begin."
                ),
            )

    current_canonical = canonicalize_status(order.get("status", ""))
    if current_canonical == canonical_target:
        return {
            "success": True,
            "status": target_display,
            "message": f"Order status is already {target_display}",
        }

    updated = await update_order_status(
        order_id,
        status,
    )

    if not updated:
        raise HTTPException(
            status_code=400,
            detail="Invalid status transition for this order.",
        )

    if canonical_target == "preparing":
        schedule_notification(
            background_tasks,
            notify_order_accepted,
            order_id,
        )

    return {
        "success": True,
        "status": target_display,
        "message": f"Order status updated to {target_display}",
    }
