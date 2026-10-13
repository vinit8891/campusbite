import random
import re
from datetime import datetime, UTC
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, Request

from app.auth.auth import assert_same_identity, require_roles
from app.core.rate_limiter import limiter
from app.auth.roles import (
    ADMIN,
    CUSTOMER,
    DELIVERY_PARTNER,
    RESTAURANT_OWNER,
)
from app.schemas.order import Order, OrderResponse, RestaurantSnapshot
from app.models.system import get_system_settings

from app.models.order import (
    calculate_order_financials,
    create_order,
    get_order_by_id,
    normalize_order_financials,
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
from app.services.courier_service import apply_courier_batch_wages
from app.services.notification_service import (
    notify_delivery_assigned,
    notify_order_accepted,
    notify_order_delivered,
    notify_order_placed,
    schedule_notification,
)
from app.services.batch_scheduler import find_or_create_batch_for_order
from app.services.location_service import (
    update_courier_location_service,
    get_courier_location_and_proximity,
)
from app.db.database import database
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email, sanitize_search_query
from app.models.delivery_partner import (
    get_delivery_partner_by_phone,
    get_delivery_partner_by_email,
)
from app.payments.amounts import (
    MIN_DELIVERY_SUBTOTAL,
    SMALL_ORDER_THRESHOLD,
    SMALL_ORDER_FEE,
    RIDER_COD_BALANCE_CEILING,
    MAX_UNREMITTED_CASH_LIMIT,
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
    response = normalize_order_financials(response)
    response.pop("delivery_otp", None)
    # Signature is verification material — do not expose on generic APIs
    response.pop("razorpay_signature", None)

    if "_id" in response:
        response["_id"] = str(response["_id"])
        if "id" not in response:
            response["id"] = response["_id"]

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
        if not partner.get("phone") or (token_phone and str(partner.get("phone")) == str(token_phone)):
            return
        raise HTTPException(
            status_code=403,
            detail="You can only access orders assigned to you",
        )

    raise HTTPException(
        status_code=403,
        detail="Insufficient permissions",
    )


async def award_referral_reward_if_eligible(order: dict):
    """When a referred student completes their first order:
    Credit the referrer with a ₹25 referral voucher code automatically added to their account.
    """
    try:
        customer_id = order.get("customer_id")
        customer_email = order.get("customer_email")
        user = None
        if customer_id and ObjectId.is_valid(str(customer_id)):
            user = await database["users"].find_one({"_id": ObjectId(str(customer_id))})
        if not user and customer_email:
            user = await database["users"].find_one({"email": customer_email.strip().lower()})

        if not user or not user.get("referred_by") or user.get("referral_rewarded"):
            return

        referrer_code = user.get("referred_by")
        referrer = await database["users"].find_one({"referral_code": referrer_code})
        if not referrer:
            return

        import secrets
        voucher_code = f"REF25-{secrets.token_hex(2).upper()}"
        voucher_item = {
            "code": voucher_code,
            "amount": 25.0,
            "created_at": datetime.now(UTC).isoformat(),
            "reason": f"Referral reward for student {user.get('full_name') or user.get('email')}",
            "is_used": False,
        }

        # Also insert into coupons collection so it can be applied directly in checkout
        await database["coupons"].insert_one({
            "code": voucher_code,
            "discount_type": "flat",
            "discount_value": 25.0,
            "min_order_value": 50.0,
            "max_discount": 25.0,
            "is_active": True,
            "usage_limit": 1,
            "used_count": 0,
            "created_at": datetime.now(UTC),
            "created_by": str(referrer["_id"]),
        })

        await database["users"].update_one(
            {"_id": referrer["_id"]},
            {"$push": {"referral_vouchers": voucher_item}}
        )
        await database["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {"referral_rewarded": True}}
        )
        logger.info(f"Awarded ₹25 referral voucher {voucher_code} to referrer {referrer.get('email')}")
    except Exception as e:
        logger.warning(f"Error in award_referral_reward_if_eligible: {e}")


@router.post("")
@router.post("/")
@limiter.limit("15/minute")
async def add_order(
    request: Request,
    order: Order,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info("orders.create request received")
    data = order.model_dump()

    # 0. Global Platform Emergency Kill-Switch Guard
    system_config = await get_system_settings()
    if not system_config.get("is_platform_active", True):
        raise HTTPException(
            status_code=503,
            detail=system_config.get("maintenance_message", "Platform is temporarily offline"),
        )

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

    rest_email = data.get("restaurant_email")
    if not rest_email:
        raise HTTPException(
            status_code=400,
            detail="restaurant_email is required",
        )

    # Hard Platform Guard: Unapproved restaurants cannot accept orders
    try:
        from app.models.restaurant import get_restaurant_by_email
        rest_doc = await get_restaurant_by_email(rest_email)
        if rest_doc:
            if rest_doc.get("is_accepting_orders") is False:
                raise HTTPException(
                    status_code=400,
                    detail="This canteen is currently not accepting orders.",
                )
            v_status = str(rest_doc.get("verification_status", "")).strip().upper()
            is_ver = rest_doc.get("is_verified")
            if v_status in ("PENDING_VERIFICATION", "PENDING", "REJECTED", "SUSPENDED") or is_ver is False:
                raise HTTPException(
                    status_code=403,
                    detail=f"Restaurant is {rest_doc.get('verification_status')} and not approved to accept orders.",
                )
            data["restaurant_id"] = str(rest_doc.get("_id", data.get("restaurant_id", "")))
            data["restaurant_name"] = rest_doc.get("name") or data.get("restaurant_name")
            data["restaurant_address"] = rest_doc.get("address") or rest_doc.get("stall_location", "Campus Eatery")
            data["restaurant_phone"] = rest_doc.get("phone")
            data["restaurant_latitude"] = rest_doc.get("latitude")
            data["restaurant_longitude"] = rest_doc.get("longitude")
            data["restaurant_info"] = {
                "name": rest_doc.get("name"),
                "address": data["restaurant_address"],
                "phone": rest_doc.get("phone"),
                "latitude": rest_doc.get("latitude"),
                "longitude": rest_doc.get("longitude"),
            }
    except HTTPException:
        raise
    except Exception:
        pass

    # Normalize fulfillment mode ("delivery" | "takeaway") and delivery_type
    raw_fulfillment = data.get("fulfillment_mode") or data.get("delivery_type") or "delivery"
    if str(raw_fulfillment).strip().lower() in ("takeaway", "counter_takeaway", "pickup"):
        fulfillment_mode = "takeaway"
        delivery_type = "COUNTER_TAKEAWAY"
    else:
        fulfillment_mode = "delivery"
        delivery_type = "HOSTEL_BATCH"

    data["fulfillment_mode"] = fulfillment_mode
    data["delivery_type"] = delivery_type

    raw_method = data.get("payment_method")
    is_online = _is_online_method(raw_method)
    method_for_calc = "ONLINE" if is_online else "COD"
    tip_amount = float(data.get("tip_amount") or 0.0)

    # 1. Base food subtotal calculation
    items_list = data.get("items") or []
    req_delivery_fee = 15.0 if fulfillment_mode == "delivery" else 0.0
    req_platform_fee = 3.0 if fulfillment_mode == "delivery" else 2.0
    financials = calculate_order_financials(
        items=items_list,
        delivery_fee=req_delivery_fee,
        platform_fee=req_platform_fee,
    )
    items_subtotal = financials["items_subtotal"]
    gst = financials["gst"]
    delivery_fee = financials["delivery_fee"]
    platform_fee = financials["platform_fee"]

    # 2. Coupon Validation & Deduction
    discount_amount = 0.0
    coupon_code = data.get("coupon_code")
    if coupon_code:
        clean_code = str(coupon_code).strip().upper()
        coupon = await database["coupons"].find_one({
            "code": clean_code,
            "is_active": True,
        })
        if coupon:
            # Check min order value and expiry
            min_val = float(coupon.get("min_order_value", 0))
            valid_until = coupon.get("valid_until")
            is_expired = False
            if valid_until:
                if isinstance(valid_until, datetime) and valid_until.tzinfo is None:
                    valid_until = valid_until.replace(tzinfo=UTC)
                elif isinstance(valid_until, str):
                    try:
                        valid_until = datetime.fromisoformat(valid_until.replace("Z", "+00:00"))
                    except ValueError:
                        valid_until = None
                if valid_until and datetime.now(UTC) > valid_until:
                    is_expired = True

            if not is_expired and items_subtotal >= min_val:
                if str(coupon.get("discount_type", "")).lower() == "percent":
                    raw_discount = (items_subtotal * float(coupon.get("discount_value", 0))) / 100.0
                    max_disc = float(coupon.get("max_discount", raw_discount))
                    discount_amount = round(min(raw_discount, max_disc), 2)
                else:
                    discount_amount = round(float(coupon.get("discount_value", 0)), 2)

                discount_amount = min(discount_amount, items_subtotal)

                # Increment used count
                await database["coupons"].update_one(
                    {"_id": coupon["_id"]},
                    {"$inc": {"used_count": 1}}
                )
    elif float(data.get("discount_amount") or 0.0) > 0:
        discount_amount = min(float(data.get("discount_amount") or 0.0), items_subtotal)

    # 3. Calculate Authoritative Server Total
    gross_total = round(items_subtotal + gst + delivery_fee + platform_fee + tip_amount - discount_amount, 2)
    gross_total = max(0.0, gross_total)

    # Account for Cash Round-off (nearest rupee for COD)
    expected_rounded_total = float(round(gross_total))
    round_off = round(expected_rounded_total - gross_total, 2)

    # Calibrated pricing calculation for legacy partner payouts
    pricing = calculate_order_amounts(
        items=items_list,
        delivery_type=delivery_type,
        tip_amount=tip_amount,
        payment_method=method_for_calc,
    )

    if fulfillment_mode == "delivery" and (items_subtotal < MIN_DELIVERY_SUBTOTAL or pricing.get("is_below_min_delivery")):
        raise HTTPException(
            status_code=400,
            detail=f"Minimum delivery subtotal is ₹{MIN_DELIVERY_SUBTOTAL:.2f}. Please add items or switch to Counter Takeaway.",
        )

    calibrated_total = max(0.0, round(pricing["total_payable"] - discount_amount, 2))
    calibrated_rounded = float(round(calibrated_total))

    # 4. Anti-Tamper Check with float tolerance & round-off support:
    raw_client_total = data.get("total_amount")
    if raw_client_total is None or (raw_client_total == 0.0 and data.get("total")):
        raw_client_total = data.get("total")
    client_total = float(raw_client_total if raw_client_total is not None else expected_rounded_total)

    is_streamlined_match = (
        abs(expected_rounded_total - client_total) <= 1.0 or abs(gross_total - client_total) <= 1.0
    )
    is_calibrated_match = (
        abs(calibrated_rounded - client_total) <= 1.0 or abs(calibrated_total - client_total) <= 1.0
    )

    if not is_streamlined_match and not is_calibrated_match:
        raise HTTPException(
            status_code=400,
            detail=f"Order amount mismatch (client: {client_total}, calculated: {expected_rounded_total})."
        )

    # Store resolved financial breakdown on the order document
    data["items_subtotal"] = items_subtotal
    data["food_subtotal"] = items_subtotal
    data["gst"] = gst
    data["delivery_fee"] = delivery_fee
    data["platform_fee"] = platform_fee
    data["discount_amount"] = discount_amount
    data["round_off"] = round_off
    data["coupon_code"] = coupon_code if discount_amount > 0 else None
    data["total_amount"] = client_total
    data["total"] = client_total
    data["amount_paise"] = to_paise(client_total)
    data["delivery_type"] = delivery_type
    data["fulfillment_mode"] = fulfillment_mode
    data["tip_amount"] = tip_amount

    # Group HOSTEL_BATCH orders into batches and calibrate rider payouts
    try:
        batch_info = await find_or_create_batch_for_order(data)
        data["batch_id"] = batch_info.get("batch_id")
        data["is_batch_addon"] = bool(batch_info.get("is_batch_addon"))
        data["batch_window_id"] = batch_info.get("batch_window_id")
        data["hostel_block"] = batch_info.get("hostel_block") or data.get("hostel_block")
        data["scheduled_wave"] = batch_info.get("scheduled_wave")

        if batch_info.get("is_batch_addon"):
            pricing["is_batch_addon"] = True
            pricing["delivery_partner_earning"] = batch_info.get(
                "calculated_payout", 10.0 + tip_amount
            )
    except Exception as e:
        logger.warning(f"Batch grouping non-critical error: {e}")

    pricing.update({
        "items_subtotal": items_subtotal,
        "food_subtotal": items_subtotal,
        "gst": gst,
        "gst_amount": gst,
        "delivery_fee": delivery_fee,
        "platform_fee": platform_fee,
        "discount_amount": discount_amount,
        "round_off": round_off,
        "gross_total": gross_total,
        "expected_rounded_total": expected_rounded_total,
        "total_payable": client_total,
        "fulfillment_mode": fulfillment_mode,
        "delivery_type": delivery_type,
    })
    data["pricing_breakdown"] = pricing

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
        "total": client_total,
        "total_amount": client_total,
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
    current_user: Annotated[dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))],
    q: Annotated[str | None, Query()] = None,
    restaurant: Annotated[str | None, Query()] = None,
    payment_method: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    if current_user.get("role") == DELIVERY_PARTNER:
        phone = current_user.get("phone")
        courier = None
        if phone:
            from app.models.delivery_partner import get_delivery_partner_by_phone
            courier = await get_delivery_partner_by_phone(phone)
        if not courier and current_user.get("email"):
            from app.models.delivery_partner import get_delivery_partner_by_email
            courier = await get_delivery_partner_by_email(current_user["email"])

        is_approved = (
            courier is not None
            and (
                courier.get("verification_status") in ("approved", "APPROVED")
                or courier.get("is_verified") is True
            )
            and courier.get("verification_status") not in (
                "pending", "PENDING_VERIFICATION", "rejected", "REJECTED", "suspended", "SUSPENDED"
            )
        )
        if not is_approved:
            raise HTTPException(
                status_code=403,
                detail="Courier account is pending verification and cannot view or claim available orders.",
            )
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
    orders = _public_orders(
        await get_delivery_orders(
            phone,
            status=status,
            q=sanitize_search_query(q),
            limit=limit,
        )
    )
    active_orders = [
        o for o in orders
        if str(o.get("status", "")).strip().lower() in {"assigned", "picked up", "picked_up", "out for delivery", "out_for_delivery"}
    ]
    if active_orders:
        apply_courier_batch_wages(active_orders)
    return orders


@router.put("/delivery/accept/{order_id}")
@router.post("/delivery/claim-order/{order_id}")
@router.post("/delivery/orders/{order_id}/claim")
@router.post("/delivery/orders/{order_id}/accept")
async def accept_delivery(
    order_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(require_roles(DELIVERY_PARTNER))],
    partner: dict | None = Body(default=None),
):
    # Always use authenticated partner identity — fallback to body or DB record
    partner_name = current_user.get("name") or ((partner or {}).get("name") if partner else None)
    partner_phone = current_user.get("phone") or ((partner or {}).get("phone") if partner else None)
    partner_vehicle = current_user.get("vehicle") or (
        (partner or {}).get("vehicle") if partner else ""
    ) or ""

    # Courier Verification Status guard:
    partner_doc_check = await get_delivery_partner_by_phone(partner_phone) if partner_phone else None
    if not partner_doc_check and current_user.get("email"):
        partner_doc_check = await get_delivery_partner_by_email(current_user["email"])

    if not partner_phone and partner_doc_check:
        partner_phone = partner_doc_check.get("phone")
    if not partner_name and partner_doc_check:
        partner_name = partner_doc_check.get("name") or partner_doc_check.get("full_name")

    is_approved = (
        partner_doc_check is not None
        and (
            partner_doc_check.get("verification_status") in ("approved", "APPROVED")
            or partner_doc_check.get("is_verified") is True
        )
        and partner_doc_check.get("verification_status") not in (
            "pending", "PENDING_VERIFICATION", "rejected", "REJECTED", "suspended", "SUSPENDED"
        )
    )
    if not is_approved:
        raise HTTPException(
            status_code=403,
            detail="Courier account is pending verification and not approved to claim orders.",
        )

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

    # Courier Cash-in-Hand (CIH) Hard Lockout guard: reject if net dues >= ₹500
    partner_doc = await get_delivery_partner_by_phone(partner_phone)
    unremitted_balance = float(
        (partner_doc or {}).get("unremitted_cod_balance")
        or (partner_doc or {}).get("cash_in_hand")
        or (partner_doc or {}).get("total_cod_collected")
        or 0.0
    )
    total_payout_earned = float(
        (partner_doc or {}).get("total_payout_earned")
        or (partner_doc or {}).get("earned_wages")
        or (partner_doc or {}).get("earnings")
        or 0.0
    )
    total_remitted = float(
        (partner_doc or {}).get("total_remitted")
        or (partner_doc or {}).get("approved_remittances")
        or 0.0
    )
    net_cash_due = max(
        0.0, unremitted_balance - total_payout_earned - total_remitted
    )
    if net_cash_due >= MAX_UNREMITTED_CASH_LIMIT:
        raise HTTPException(
            status_code=403,
            detail="Cash-in-hand limit reached. Remit cash to claim new runs.",
        )

    is_primary = (active_count == 0)
    wage = 20.0 if is_primary else 14.0
    wage_type = "base" if is_primary else "batch_addon"

    success = await assign_delivery_partner(
        order_id=order_id,
        partner_name=partner_name,
        partner_phone=partner_phone,
        partner_vehicle=partner_vehicle,
        courier_earning=wage,
        is_primary_batch_order=is_primary,
        wage_type=wage_type,
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
@router.post("/delivery/location/{order_id}")
@router.post("/{order_id}/location")
async def update_location(
    order_id: str,
    current_user: Annotated[dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))],
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
    partner_phone = partner.get("phone")

    if partner_phone and token_phone and str(partner_phone) != str(token_phone) and current_user.get("role") != ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You can only update location for your assigned orders",
        )

    if not partner_phone and token_phone:
        partner_bind = {
            "name": current_user.get("name") or "Delivery Partner",
            "phone": token_phone,
            "vehicle": current_user.get("vehicle") or "Bike",
            "accepted_at": datetime.now(UTC),
        }
        await update_order_status(
            order_id,
            order.get("status", "Assigned"),
            delivery_partner=partner_bind,
        )

    latitude = location.get("latitude")
    longitude = location.get("longitude")
    heading = location.get("heading")
    speed = location.get("speed")

    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Latitude and Longitude are required.",
        )

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Latitude and Longitude must be valid numbers.",
        )

    proximity_result = await update_courier_location_service(
        order_id=order_id,
        latitude=lat,
        longitude=lon,
        heading=float(heading) if heading is not None else None,
        speed=float(speed) if speed is not None else None,
        destination_lat=order.get("latitude"),
        destination_lon=order.get("longitude"),
        hostel_block=order.get("hostel_block"),
    )

    await update_delivery_location(
        order_id,
        lat,
        lon,
    )

    return {
        "success": True,
        "message": "Delivery Location Updated",
        "data": proximity_result,
        "is_within_200m": proximity_result["is_within_200m"],
        "distance_meters": proximity_result["distance_meters"],
    }


async def _resolve_restaurant_snapshot(order: dict) -> dict:
    rest_id = order.get("restaurant_id") or order.get("canteen_id")
    restaurant_data = {}
    if rest_id:
        try:
            or_conditions = []
            if ObjectId.is_valid(str(rest_id)):
                or_conditions.append({"_id": ObjectId(str(rest_id))})
            or_conditions.append({"_id": str(rest_id)})
            rest_doc = await database["restaurants"].find_one({"$or": or_conditions})
            if not rest_doc and order.get("restaurant_email"):
                rest_doc = await database["restaurants"].find_one({"email": order["restaurant_email"]})
            if rest_doc:
                restaurant_data = {
                    "name": rest_doc.get("name") or rest_doc.get("business_name", "Campus Canteen"),
                    "address": rest_doc.get("address") or rest_doc.get("stall_location", "Zeal Campus Grounds"),
                    "stall_location": rest_doc.get("stall_location"),
                    "phone": rest_doc.get("phone") or rest_doc.get("mobile"),
                    "latitude": rest_doc.get("latitude") or 18.4485,
                    "longitude": rest_doc.get("longitude") or 73.8242,
                }
        except Exception:
            pass

    if not restaurant_data and order.get("restaurant_email"):
        try:
            rest_doc = await database["restaurants"].find_one({"email": order["restaurant_email"]})
            if rest_doc:
                restaurant_data = {
                    "name": rest_doc.get("name") or rest_doc.get("business_name", "Campus Canteen"),
                    "address": rest_doc.get("address") or rest_doc.get("stall_location", "Zeal Campus Grounds"),
                    "stall_location": rest_doc.get("stall_location"),
                    "phone": rest_doc.get("phone") or rest_doc.get("mobile"),
                    "latitude": rest_doc.get("latitude") or 18.4485,
                    "longitude": rest_doc.get("longitude") or 73.8242,
                }
        except Exception:
            pass

    if not restaurant_data:
        restaurant_data = {
            "name": order.get("restaurant_name", "Campus Canteen"),
            "address": order.get("restaurant_address") or order.get("stall_location", "Zeal Campus Grounds"),
            "stall_location": order.get("stall_location"),
            "phone": order.get("restaurant_phone"),
            "latitude": order.get("restaurant_latitude") or 18.4485,
            "longitude": order.get("restaurant_longitude") or 73.8242,
        }
    return restaurant_data


@router.get("/delivery/location/{order_id}")
@router.get("/{order_id}/courier-location")
@router.get("/courier-location/{order_id}")
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
    
    rest_data = await _resolve_restaurant_snapshot(order)
    proximity_data = await get_courier_location_and_proximity(order_id, order_doc=order)
    partner = order.get("delivery_partner") or {}
    legacy_data = {
        "partner_latitude": partner.get("latitude"),
        "partner_longitude": partner.get("longitude"),
        "customer_latitude": order.get("latitude"),
        "customer_longitude": order.get("longitude"),
        "restaurant_latitude": rest_data.get("latitude") or order.get("restaurant_latitude") or 18.4485,
        "restaurant_longitude": rest_data.get("longitude") or order.get("restaurant_longitude") or 73.8242,
        "restaurant_name": rest_data.get("name") or order.get("restaurant_name", "Campus Canteen"),
        "restaurant_address": rest_data.get("address"),
        "restaurant_phone": rest_data.get("phone"),
        "restaurant": rest_data,
        "restaurant_info": rest_data,
        "last_location_update": partner.get("last_location_update"),
        "status": order.get("status"),
    }

    return {
        **legacy_data,
        **(proximity_data or {}),
        "status": order.get("status"),
    }


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
        partner_phone = partner.get("phone")
        token_clean = re.sub(r"\D", "", str(token_phone or ""))[-10:]
        partner_clean = re.sub(r"\D", "", str(partner_phone or ""))[-10:]
        if partner_clean and token_clean and partner_clean != token_clean:
            raise HTTPException(
                status_code=403,
                detail="You can only verify OTP for your assigned orders",
            )
        if not partner_phone and token_phone:
            partner_to_bind = {
                "name": current_user.get("name") or "Delivery Partner",
                "phone": token_phone,
                "vehicle": current_user.get("vehicle") or "Bike",
                "accepted_at": datetime.now(UTC),
            }
            await database["orders"].update_one(
                {"_id": order["_id"]},
                {"$set": {"delivery_partner": partner_to_bind}},
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

    failed_attempts = order.get("failed_otp_attempts", 0)
    if failed_attempts >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect OTP attempts. Order locked for security. Contact campus admin.",
        )

    otp = body.get("otp")
    if otp is None:
        otp = body.get("delivery_otp")
    if otp is None:
        otp = body.get("code")

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
        current_failed = (refreshed or {}).get("failed_otp_attempts", failed_attempts + 1)
        if current_failed >= 5:
            raise HTTPException(
                status_code=429,
                detail="Too many incorrect OTP attempts. Order locked for security. Contact campus admin.",
            )
        remaining = max(0, 5 - current_failed)
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect OTP. {remaining} attempt(s) remaining.",
        )

    # When a COD order is delivered with cash collection, increment rider's unremitted COD balance
    is_cod_order = (
        _is_cod_method(order.get("payment_method"))
        or str(order.get("payment_method", "")).lower() == "cod"
    )
    collection_type = str(
        body.get("collection_type") or body.get("collection_mode") or ""
    ).lower().strip()

    if is_cod_order and collection_type != "upi":
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

    await award_referral_reward_if_eligible(order)

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

    await award_referral_reward_if_eligible(order)

    return {
        "success": True,
        "message": "Emergency delivery completed successfully",
    }


@router.get("/{order_id}", response_model=OrderResponse)
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

    # Retrieve restaurant info
    restaurant_data = await _resolve_restaurant_snapshot(order)

    order["restaurant"] = restaurant_data
    order["restaurant_info"] = restaurant_data
    order["restaurant_name"] = restaurant_data.get("name", order.get("restaurant_name", "Campus Canteen"))
    if not order.get("restaurant_latitude"):
        order["restaurant_latitude"] = restaurant_data.get("latitude", 18.4485)
    if not order.get("restaurant_longitude"):
        order["restaurant_longitude"] = restaurant_data.get("longitude", 73.8242)

    return _public_order(order)


@router.put("/{order_id}/status")
@router.patch("/{order_id}")
@router.patch("/{order_id}/status")
async def update_status_body(
    order_id: str,
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
    body: dict = Body(...),
):
    status = (
        body.get("status")
        or body.get("delivery_status")
        or body.get("next_status")
    )
    if not status:
        raise HTTPException(
            status_code=400,
            detail="Status field is required in request body",
        )
    return await change_status(
        order_id=order_id,
        status=str(status),
        background_tasks=background_tasks,
        current_user=current_user,
    )


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
    partner_to_bind = None

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
        partner_phone = partner.get("phone")

        token_clean = re.sub(r"\D", "", str(token_phone or ""))[-10:]
        partner_clean = re.sub(r"\D", "", str(partner_phone or ""))[-10:]

        if partner_clean and token_clean and partner_clean != token_clean:
            raise HTTPException(
                status_code=403,
                detail="You can only update orders assigned to you",
            )
        if canonical_target not in {"assigned", "picked_up", "out_for_delivery", "delivered"}:
            raise HTTPException(
                status_code=403,
                detail="Delivery partners cannot set this status",
            )

        if not partner_phone and token_phone:
            partner_to_bind = {
                "name": current_user.get("name") or "Delivery Partner",
                "phone": token_phone,
                "vehicle": current_user.get("vehicle") or "Bike",
                "accepted_at": datetime.now(UTC),
            }

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
        if partner_to_bind:
            await update_order_status(
                order_id,
                status,
                delivery_partner=partner_to_bind,
            )
        refreshed = await get_order_by_id(order_id) or order
        return {
            "success": True,
            "status": target_display,
            "message": f"Order status is already {target_display}",
            "order": _public_order(refreshed),
        }

    updated = await update_order_status(
        order_id,
        status,
        delivery_partner=partner_to_bind,
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
    elif canonical_target == "delivered":
        schedule_notification(
            background_tasks,
            notify_order_delivered,
            order_id,
        )
        await award_referral_reward_if_eligible(order)

    refreshed_order = await get_order_by_id(order_id) or order
    return {
        "success": True,
        "status": target_display,
        "message": f"Order status updated to {target_display}",
        "order": _public_order(refreshed_order),
    }
