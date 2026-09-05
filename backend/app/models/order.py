from datetime import datetime, UTC
import re

from bson import ObjectId
from bson.errors import InvalidId

from app.db.database import database

order_collection = database["orders"]


def get_object_id(order_id: str):
    try:
        return ObjectId(order_id)
    except InvalidId:
        return None


def parse_date_bound(value: str | None, *, end_of_day: bool = False) -> datetime | None:
    """Parse YYYY-MM-DD or ISO datetime into UTC-aware bound."""
    if not value or not str(value).strip():
        return None

    raw = str(value).strip()
    try:
        if len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
            dt = datetime.strptime(raw, "%Y-%m-%d").replace(tzinfo=UTC)
            if end_of_day:
                return dt.replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )
            return dt

        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        else:
            dt = dt.astimezone(UTC)
        return dt
    except ValueError:
        return None


def _date_range_clause(
    from_dt: datetime | None,
    to_dt: datetime | None,
) -> dict | None:
    if not from_dt and not to_dt:
        return None

    range_q: dict = {}
    if from_dt:
        range_q["$gte"] = from_dt
    if to_dt:
        range_q["$lte"] = to_dt

    # Prefer delivered_at; fall back to created_at when missing
    return {
        "$or": [
            {"delivered_at": range_q},
            {
                "$and": [
                    {
                        "$or": [
                            {"delivered_at": {"$exists": False}},
                            {"delivered_at": None},
                        ]
                    },
                    {"created_at": range_q},
                ]
            },
        ]
    }


async def create_order(data):
    result = await order_collection.insert_one(data)
    return str(result.inserted_id)


async def subscription_order_exists(
    subscription_id: str,
    order_date: str,
) -> bool:
    """True when a subscription-generated order already exists for this date."""
    count = await order_collection.count_documents(
        {
            "subscription_id": subscription_id,
            "subscription_order_date": order_date,
            "generated_by": "subscription",
        }
    )
    return count > 0


async def get_last_subscription_order_for_customer(customer_email: str) -> dict | None:
    order = await order_collection.find_one(
        {
            "customer_email": customer_email.lower(),
            "generated_by": "subscription",
        },
        sort=[("created_at", -1)],
    )
    if not order:
        return None
    order["_id"] = str(order["_id"])
    return order


async def get_order_by_id(order_id: str):
    oid = get_object_id(order_id)

    if not oid:
        return None

    order = await order_collection.find_one({"_id": oid})

    if not order:
        return None

    order["_id"] = str(order["_id"])
    return order


async def get_orders(
    *,
    status: str | None = None,
    payment_status: str | None = None,
    payment_method: str | None = None,
    q: str | None = None,
    page: int = 1,
    limit: int = 20,
):
    """List orders newest-first with optional admin filters. Read-only query."""
    from app.core.pagination import (
        normalize_limit,
        normalize_page,
        paginated_response,
        skip_for,
    )

    query: dict = {}

    if status:
        query["status"] = status

    if payment_status:
        query["payment_status"] = payment_status

    if payment_method:
        query["payment_method"] = payment_method

    if q and q.strip():
        term = q.strip()
        escaped = re.escape(term)
        or_clauses: list[dict] = [
            {"customer_name": {"$regex": escaped, "$options": "i"}},
            {"customer_email": {"$regex": escaped, "$options": "i"}},
            {"restaurant_email": {"$regex": escaped, "$options": "i"}},
        ]

        oid = get_object_id(term)
        if oid:
            or_clauses.append({"_id": oid})

        query["$or"] = or_clauses

    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await order_collection.count_documents(query)
    meta_page = min(safe_page, max(1, (total + safe_limit - 1) // safe_limit or 1))

    orders = []
    cursor = (
        order_collection.find(query)
        .sort("created_at", -1)
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return paginated_response(
        orders, total=total, page=meta_page, limit=safe_limit
    )


async def get_customer_orders(phone: str):
    orders = []

    async for order in order_collection.find({"phone": phone}).sort(
        "created_at", -1
    ):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


async def get_restaurant_orders(
    email: str,
    *,
    status: str | None = None,
    payment_status: str | None = None,
    payment_method: str | None = None,
    q: str | None = None,
    limit: int = 50,
):
    """Restaurant-scoped orders, newest first, with optional filters."""
    query: dict = {"restaurant_email": email}

    if status:
        query["status"] = status

    if payment_status:
        query["payment_status"] = payment_status

    if payment_method:
        query["payment_method"] = payment_method

    if q and q.strip():
        term = q.strip()
        escaped = re.escape(term)
        or_clauses: list[dict] = [
            {"customer_name": {"$regex": escaped, "$options": "i"}},
            {"customer_email": {"$regex": escaped, "$options": "i"}},
        ]

        oid = get_object_id(term)
        if oid:
            or_clauses.append({"_id": oid})

        query["$or"] = or_clauses

    safe_limit = max(1, min(int(limit or 50), 200))

    orders = []
    cursor = (
        order_collection.find(query).sort("created_at", -1).limit(safe_limit)
    )

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


async def get_available_orders(
    *,
    q: str | None = None,
    restaurant: str | None = None,
    payment_method: str | None = None,
    page: int = 1,
    limit: int = 20,
):
    """Unassigned Ready-for-Pickup orders, newest first, optional filters."""
    from app.core.pagination import (
        normalize_limit,
        normalize_page,
        paginated_response,
        skip_for,
    )

    query: dict = {
        "status": "Ready for Pickup",
        "$or": [
            {"delivery_partner": {"$exists": False}},
            {"delivery_partner": None},
            {"delivery_partner.phone": {"$exists": False}},
        ],
    }
    ands: list[dict] = []

    if restaurant and restaurant.strip():
        escaped = re.escape(restaurant.strip())
        ands.append(
            {
                "restaurant_email": {
                    "$regex": escaped,
                    "$options": "i",
                }
            }
        )

    if payment_method and payment_method.strip():
        method = payment_method.strip().lower()
        ands.append(
            {
                "payment_method": {
                    "$regex": f"^{re.escape(method)}$",
                    "$options": "i",
                }
            }
        )

    if q and q.strip():
        term = q.strip()
        escaped = re.escape(term)
        or_clauses: list[dict] = [
            {"customer_name": {"$regex": escaped, "$options": "i"}},
            {"customer_email": {"$regex": escaped, "$options": "i"}},
            {"restaurant_email": {"$regex": escaped, "$options": "i"}},
            {"address": {"$regex": escaped, "$options": "i"}},
        ]
        oid = get_object_id(term)
        if oid:
            or_clauses.append({"_id": oid})
        ands.append({"$or": or_clauses})

    if ands:
        query = {
            "$and": [
                {"status": "Ready for Pickup"},
                {
                    "$or": [
                        {"delivery_partner": {"$exists": False}},
                        {"delivery_partner": None},
                        {"delivery_partner.phone": {"$exists": False}},
                    ]
                },
                *ands,
            ]
        }

    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await order_collection.count_documents(query)
    pages = max(1, (total + safe_limit - 1) // safe_limit) if total else 1
    meta_page = min(safe_page, pages)

    orders = []
    cursor = (
        order_collection.find(query)
        .sort("created_at", -1)
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return paginated_response(
        orders, total=total, page=meta_page, limit=safe_limit
    )


async def get_my_customer_orders(
    customer_id: str | None,
    phone: str | None,
    email: str | None,
):
    clauses = []

    if customer_id:
        clauses.append({"customer_id": str(customer_id)})

    if phone:
        clauses.append({"phone": phone})

    if email:
        clauses.append({"customer_email": email})

    if not clauses:
        return []

    orders = []

    async for order in order_collection.find({"$or": clauses}).sort(
        "created_at", -1
    ):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


async def get_delivered_orders(
    *,
    from_date: str | None = None,
    to_date: str | None = None,
    q: str | None = None,
    page: int = 1,
    limit: int = 20,
):
    """All delivered orders (admin history), newest first, optional filters."""
    from app.core.pagination import (
        normalize_limit,
        normalize_page,
        paginated_response,
        skip_for,
    )

    query: dict = {"status": "Delivered"}
    ands: list[dict] = []

    if q and q.strip():
        term = q.strip()
        escaped = re.escape(term)
        or_clauses: list[dict] = [
            {"customer_name": {"$regex": escaped, "$options": "i"}},
            {"customer_email": {"$regex": escaped, "$options": "i"}},
            {"restaurant_email": {"$regex": escaped, "$options": "i"}},
        ]
        oid = get_object_id(term)
        if oid:
            or_clauses.append({"_id": oid})
        ands.append({"$or": or_clauses})

    date_clause = _date_range_clause(
        parse_date_bound(from_date),
        parse_date_bound(to_date, end_of_day=True),
    )
    if date_clause:
        ands.append(date_clause)

    if ands:
        query["$and"] = ands

    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await order_collection.count_documents(query)
    pages = max(1, (total + safe_limit - 1) // safe_limit) if total else 1
    meta_page = min(safe_page, pages)

    orders = []
    cursor = (
        order_collection.find(query)
        .sort([("delivered_at", -1), ("created_at", -1)])
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return paginated_response(
        orders, total=total, page=meta_page, limit=safe_limit
    )


async def get_delivery_orders(
    phone: str,
    *,
    status: str | None = None,
    q: str | None = None,
    limit: int = 50,
    from_date: str | None = None,
    to_date: str | None = None,
    page: int | None = None,
):
    """Partner-scoped delivery orders, newest first, with optional filters."""
    from app.core.pagination import (
        normalize_limit,
        normalize_page,
        paginated_response,
        skip_for,
    )

    query: dict = {"delivery_partner.phone": phone}
    ands: list[dict] = []

    if status:
        query["status"] = status

    if q and q.strip():
        term = q.strip()
        escaped = re.escape(term)
        or_clauses: list[dict] = [
            {"customer_name": {"$regex": escaped, "$options": "i"}},
            {"customer_email": {"$regex": escaped, "$options": "i"}},
            {"restaurant_email": {"$regex": escaped, "$options": "i"}},
        ]

        oid = get_object_id(term)
        if oid:
            or_clauses.append({"_id": oid})

        ands.append({"$or": or_clauses})

    date_clause = _date_range_clause(
        parse_date_bound(from_date),
        parse_date_bound(to_date, end_of_day=True),
    )
    if date_clause:
        ands.append(date_clause)

    if ands:
        query["$and"] = ands

    # History (Delivered) prefers delivered_at; active orders use accepted_at
    primary_sort = (
        "delivered_at" if status == "Delivered" else "delivery_partner.accepted_at"
    )

    # Legacy list mode (My Orders) when page is omitted
    if page is None:
        safe_limit = max(1, min(int(limit or 50), 200))
        orders = []
        cursor = (
            order_collection.find(query)
            .sort([(primary_sort, -1), ("created_at", -1)])
            .limit(safe_limit)
        )
        async for order in cursor:
            order["_id"] = str(order["_id"])
            orders.append(order)
        return orders

    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await order_collection.count_documents(query)
    pages = max(1, (total + safe_limit - 1) // safe_limit) if total else 1
    meta_page = min(safe_page, pages)

    orders = []
    cursor = (
        order_collection.find(query)
        .sort([(primary_sort, -1), ("created_at", -1)])
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )

    async for order in cursor:
        order["_id"] = str(order["_id"])
        orders.append(order)

    return paginated_response(
        orders, total=total, page=meta_page, limit=safe_limit
    )

async def assign_delivery_partner(
    order_id: str,
    partner_name: str,
    partner_phone: str,
    partner_vehicle: str = "",
):
    oid = get_object_id(order_id)

    if not oid:
        return False

    result = await order_collection.update_one(
        {
            "_id": oid,
            "status": "Ready for Pickup",
            "$or": [
                {"delivery_partner": {"$exists": False}},
                {"delivery_partner": None},
                {"delivery_partner.phone": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "status": "Assigned",
                "delivery_partner.name": partner_name,
                "delivery_partner.phone": partner_phone,
                "delivery_partner.vehicle": partner_vehicle,
                "delivery_partner.latitude": None,
                "delivery_partner.longitude": None,
                "delivery_partner.accepted_at": datetime.now(UTC),
                "delivery_partner.last_location_update": None,
            }
        },
    )

    return result.modified_count == 1


def canonicalize_status(status: str | None) -> str:
    if not status:
        return ""
    s = str(status).lower().strip().replace("-", "_").replace("%20", " ")
    if s in ["pending"]:
        return "pending"
    if s in ["accepted", "preparing", "cooking", "in_prep", "in prep"]:
        return "preparing"
    if s in ["ready", "ready_for_pickup", "ready for pickup"]:
        return "ready"
    if s in ["assigned"]:
        return "assigned"
    if s in ["picked_up", "picked up"]:
        return "picked_up"
    if s in [
        "out_for_delivery",
        "out for delivery",
        "in transit",
        "in_transit",
    ]:
        return "out_for_delivery"
    if s in ["delivered", "completed"]:
        return "delivered"
    if s in ["cancelled", "rejected"]:
        return "cancelled"
    return s


def can_transition_to(
    current_status: str | None, new_status: str | None
) -> bool:
    curr = canonicalize_status(current_status)
    target = canonicalize_status(new_status)

    # 1. Idempotent check: If already in this logical state, permit it!
    if curr == target:
        return True

    # 2. Flexible transition matrix
    ALLOWED_TRANSITIONS = {
        "pending": {"preparing", "ready", "cancelled"},
        "preparing": {"ready", "preparing", "cancelled"},  # Allow re-cooking
        "ready": {
            "preparing",
            "assigned",
            "picked_up",
            "out_for_delivery",
            "delivered",
            "cancelled",
        },  # Allow reverting if marked ready by accident
        "assigned": {
            "assigned",
            "picked_up",
            "out_for_delivery",
            "delivered",
            "cancelled",
        },
        "picked_up": {
            "picked_up",
            "out_for_delivery",
            "delivered",
            "cancelled",
        },
        "out_for_delivery": {
            "picked_up",
            "out_for_delivery",
            "delivered",
            "cancelled",
        },
        "delivered": set(),
        "cancelled": set(),
    }

    return target in ALLOWED_TRANSITIONS.get(curr, set())


DISPLAY_STATUS_MAP: dict[str, str] = {
    "pending": "Pending",
    "preparing": "Preparing",
    "ready": "Ready for Pickup",
    "assigned": "Assigned",
    "picked_up": "Picked Up",
    "out_for_delivery": "Out for Delivery",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
    "rejected": "Cancelled",
}


STATUS_NORMALIZATION_MAP: dict[str, str] = {
    "pending": "Pending",
    "placed": "Pending",
    "accepted": "Accepted",
    "preparing": "Preparing",
    "cooking": "Preparing",
    "in_prep": "Preparing",
    "in prep": "Preparing",
    "ready": "Ready for Pickup",
    "ready_for_pickup": "Ready for Pickup",
    "ready for pickup": "Ready for Pickup",
    "assigned": "Assigned",
    "picked_up": "Picked Up",
    "picked up": "Picked Up",
    "out_for_delivery": "Out for Delivery",
    "out for delivery": "Out for Delivery",
    "delivered": "Delivered",
    "completed": "Delivered",
    "cancelled": "Cancelled",
    "rejected": "Cancelled",
}


async def update_order_status(
    order_id: str,
    status: str,
    delivery_partner=None,
):
    oid = get_object_id(order_id)

    if not oid:
        return False

    order = await order_collection.find_one({"_id": oid})

    if not order:
        return False

    current_status = str(order.get("status", "")).strip()
    canonical_current = canonicalize_status(current_status)
    canonical_target = canonicalize_status(status)

    raw_key = str(status).lower().strip().replace("-", "_")
    normalized_target = (
        STATUS_NORMALIZATION_MAP.get(raw_key)
        or STATUS_NORMALIZATION_MAP.get(raw_key.replace("_", " "))
    )
    target_display = (
        normalized_target
        or STATUS_NORMALIZATION_MAP.get(canonical_target)
        or DISPLAY_STATUS_MAP.get(canonical_target, status.strip().title())
    )

    # Idempotent status update: if already in target canonical state, succeed immediately
    if canonical_current == canonical_target:
        return True

    if not can_transition_to(current_status, status):
        return False

    update_data = {"status": target_display}

    if target_display in ["Accepted", "Preparing"] and not order.get("accepted_at"):
        update_data["accepted_at"] = datetime.now(UTC)

    if target_display == "Ready for Pickup" and not order.get("ready_at"):
        update_data["ready_at"] = datetime.now(UTC)

    if target_display == "Delivered" and not order.get("delivered_at"):
        update_data["delivered_at"] = datetime.now(UTC)

    if delivery_partner:
        update_data["delivery_partner"] = delivery_partner

    result = await order_collection.update_one(
        {"_id": oid},
        {"$set": update_data},
    )

    return result.matched_count > 0


async def update_delivery_location(
    order_id: str,
    latitude: float,
    longitude: float,
):
    oid = get_object_id(order_id)

    if not oid:
        return False

    result = await order_collection.update_one(
        {
            "_id": oid,
            "status": {
                "$in": ["Assigned", "Picked Up", "Out for Delivery"]
            },
        },
        {
            "$set": {
                "delivery_partner.latitude": latitude,
                "delivery_partner.longitude": longitude,
            },
            "$currentDate": {
                "delivery_partner.last_location_update": True
            },
        },
    )

    return result.modified_count == 1


async def get_delivery_location(order_id: str):
    oid = get_object_id(order_id)

    if not oid:
        return None

    order = await order_collection.find_one({"_id": oid})

    if not order:
        return None

    partner = order.get("delivery_partner", {})

    return {
        "partner_latitude": partner.get("latitude"),
        "partner_longitude": partner.get("longitude"),
        "customer_latitude": order.get("latitude"),
        "customer_longitude": order.get("longitude"),
        "restaurant_latitude": order.get("restaurant_latitude"),
        "restaurant_longitude": order.get("restaurant_longitude"),
        "last_location_update": partner.get("last_location_update"),
        "status": order.get("status"),
    }


async def get_order_otp(order_id: str):
    oid = get_object_id(order_id)

    if not oid:
        return None

    order = await order_collection.find_one(
        {"_id": oid},
        {
            "delivery_otp": 1,
            "otp_verified": 1,
            "status": 1,
        },
    )

    if not order:
        return None

    verified = bool(
        order.get("otp_verified") or order.get("status") == "Delivered"
    )

    return {
        "otp": None if verified else order.get("delivery_otp"),
        "verified": verified,
        "status": order.get("status"),
    }


async def verify_delivery_otp(order_id: str, otp):
    oid = get_object_id(order_id)

    if not oid:
        return False

    order = await order_collection.find_one({"_id": oid})

    if not order:
        return False

    curr_status = order.get("status")
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
    canonical = canonicalize_status(curr_status)
    if (
        curr_status not in allowed_otp_statuses
        and canonical not in ["assigned", "picked_up", "out_for_delivery"]
    ):
        return False

    if order.get("otp_verified") or order.get("status") == "Delivered":
        return False

    # Security Lockout: Max 5 failed attempts
    if order.get("failed_otp_attempts", 0) >= 5:
        return False

    stored_otp = str(order.get("delivery_otp", "")).strip()
    entered_otp = str(otp).strip()

    if not stored_otp or stored_otp != entered_otp:
        await order_collection.update_one(
            {"_id": oid},
            {"$inc": {"failed_otp_attempts": 1}},
        )
        return False

    now = datetime.now(UTC)
    update_fields = {
        "otp_verified": True,
        "status": "Delivered",
        "delivered_at": now,
        "failed_otp_attempts": 0,
    }

    # For COD orders, OTP handover confirms cash collection at the door
    payment_method = (
        str(order.get("payment_method", ""))
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )
    if (
        payment_method
        in [
            "cod",
            "cash_on_delivery",
            "cashondelivery",
            "cash",
            "cash_on_delivery_(cod)",
        ]
        or "cash" in payment_method
        or not payment_method
    ):
        update_fields["payment_status"] = "paid"
        update_fields["paid_at"] = now

    result = await order_collection.update_one(
        {
            "_id": oid,
            "otp_verified": False,
        },
        {
            "$set": update_fields,
            "$unset": {
                "delivery_otp": "",
            },
        },
    )

    return result.modified_count == 1


async def emergency_deliver_order(
    order_id: str,
    reason: str,
    actor_email: str = "",
):
    oid = get_object_id(order_id)

    if not oid:
        return False

    order = await order_collection.find_one({"_id": oid})

    if not order:
        return False

    if order.get("status") == "Delivered" or order.get("otp_verified"):
        return False

    now = datetime.now(UTC)
    update_fields = {
        "status": "Delivered",
        "otp_verified": True,
        "delivered_at": now,
        "failed_otp_attempts": 0,
        "emergency_delivery": {
            "bypassed": True,
            "reason": reason,
            "authorized_by": actor_email,
            "bypassed_at": now,
        },
    }

    payment_method = (
        str(order.get("payment_method", ""))
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )
    if (
        payment_method
        in [
            "cod",
            "cash_on_delivery",
            "cashondelivery",
            "cash",
            "cash_on_delivery_(cod)",
        ]
        or "cash" in payment_method
        or not payment_method
    ):
        update_fields["payment_status"] = "paid"
        update_fields["paid_at"] = now

    result = await order_collection.update_one(
        {"_id": oid},
        {
            "$set": update_fields,
            "$unset": {
                "delivery_otp": "",
            },
        },
    )

    return result.modified_count == 1
