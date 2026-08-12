from __future__ import annotations

from datetime import UTC, date, datetime

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.pagination import (
    normalize_limit,
    normalize_page,
    paginated_response,
    skip_for,
)
from app.db.database import database

payment_collection = database["subscription_payments"]

PAYMENT_STATUS_PENDING = "pending"
PAYMENT_STATUS_PROCESSING = "processing"
PAYMENT_STATUS_PAID = "paid"
PAYMENT_STATUS_FAILED = "failed"

ACTIVE_PAYMENT_STATUSES = (
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_PROCESSING,
    PAYMENT_STATUS_PAID,
)

BILLING_FIELDS = (
    "payment_id",
    "subscription_id",
    "amount",
    "billing_period",
    "payment_method",
    "payment_status",
    "paid_at",
    "renewal_due",
    "transaction_reference",
)


def _object_id(value: str):
    try:
        return ObjectId(value)
    except InvalidId:
        return None


def _parse_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str) and value.strip():
        return date.fromisoformat(value.strip()[:10])
    return None


def _serialize(doc: dict | None, *, full: bool = False) -> dict | None:
    if not doc:
        return None
    result = dict(doc)
    result["payment_id"] = str(result.pop("_id"))
    for key in ("paid_at", "renewal_due", "created_at", "renewal_completed_at"):
        value = result.get(key)
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
    if not full:
        return result
    return result


def _billing_item(doc: dict | None) -> dict | None:
    serialized = _serialize(doc)
    if not serialized:
        return None
    return {key: serialized.get(key) for key in BILLING_FIELDS if key in serialized}


async def create_subscription_payment(data: dict, *, session=None) -> str:
    payload = dict(data)
    payload.setdefault("created_at", datetime.now(UTC))
    payload.setdefault("subscription_synced", False)
    result = await payment_collection.insert_one(payload, session=session)
    return str(result.inserted_id)


async def insert_renewal_payment_if_absent(data: dict, *, session=None) -> tuple[str, bool]:
    """
    Insert a renewal payment or return an existing active record for the billing period.
    Returns (payment_id, created).
    """
    subscription_id = data.get("subscription_id")
    billing_period = data.get("billing_period")
    if subscription_id and billing_period:
        existing = await payment_collection.find_one(
            {
                "subscription_id": subscription_id,
                "billing_period": billing_period,
                "payment_status": {"$in": list(ACTIVE_PAYMENT_STATUSES)},
            },
            session=session,
        )
        if existing:
            return str(existing["_id"]), False

    try:
        payment_id = await create_subscription_payment(data, session=session)
        return payment_id, True
    except DuplicateKeyError:
        existing = await payment_collection.find_one(
            {
                "subscription_id": subscription_id,
                "billing_period": billing_period,
                "payment_status": {"$in": list(ACTIVE_PAYMENT_STATUSES)},
            },
            session=session,
        )
        if existing:
            return str(existing["_id"]), False
        raise


async def update_subscription_payment(
    payment_id: str,
    updates: dict,
    *,
    session=None,
) -> bool:
    oid = _object_id(payment_id)
    if not oid:
        return False
    result = await payment_collection.update_one(
        {"_id": oid},
        {"$set": updates},
        session=session,
    )
    return result.modified_count == 1 or result.matched_count == 1


async def get_payment_by_id(payment_id: str, *, full: bool = False) -> dict | None:
    oid = _object_id(payment_id)
    if not oid:
        return None
    doc = await payment_collection.find_one({"_id": oid})
    return _serialize(doc, full=full)


async def get_payment_by_razorpay_order_id(razorpay_order_id: str) -> dict | None:
    if not razorpay_order_id:
        return None
    doc = await payment_collection.find_one({"razorpay_order_id": razorpay_order_id})
    return _serialize(doc, full=True)


async def get_payment_by_transaction_reference(reference: str) -> dict | None:
    if not reference:
        return None
    doc = await payment_collection.find_one({"transaction_reference": reference})
    return _serialize(doc, full=True)


async def get_payment_by_razorpay_payment_id(razorpay_payment_id: str) -> dict | None:
    if not razorpay_payment_id:
        return None
    doc = await payment_collection.find_one(
        {
            "$or": [
                {"transaction_reference": razorpay_payment_id},
                {"razorpay_payment_id": razorpay_payment_id},
            ]
        }
    )
    return _serialize(doc, full=True)


async def get_latest_payment_for_subscription(subscription_id: str) -> dict | None:
    doc = await payment_collection.find_one(
        {"subscription_id": subscription_id},
        sort=[("created_at", -1)],
    )
    return _billing_item(doc)


async def get_latest_paid_payment_for_subscription(subscription_id: str) -> dict | None:
    doc = await payment_collection.find_one(
        {"subscription_id": subscription_id, "payment_status": PAYMENT_STATUS_PAID},
        sort=[("paid_at", -1), ("created_at", -1)],
    )
    return _billing_item(doc)


async def find_pending_renewal_for_subscription(subscription_id: str) -> dict | None:
    doc = await payment_collection.find_one(
        {
            "subscription_id": subscription_id,
            "payment_status": {"$in": [PAYMENT_STATUS_PENDING, PAYMENT_STATUS_PROCESSING]},
            "razorpay_order_id": {"$exists": True, "$ne": None},
        },
        sort=[("created_at", -1)],
    )
    return _serialize(doc, full=True)


async def find_incomplete_paid_renewal(subscription_id: str) -> dict | None:
    doc = await payment_collection.find_one(
        {
            "subscription_id": subscription_id,
            "payment_status": PAYMENT_STATUS_PAID,
            "subscription_synced": {"$ne": True},
        },
        sort=[("paid_at", -1), ("created_at", -1)],
    )
    return _serialize(doc, full=True)


async def find_active_renewal_for_billing_period(
    subscription_id: str,
    billing_period: str,
) -> dict | None:
    doc = await payment_collection.find_one(
        {
            "subscription_id": subscription_id,
            "billing_period": billing_period,
            "payment_status": {"$in": list(ACTIVE_PAYMENT_STATUSES)},
        },
        sort=[("created_at", -1)],
    )
    return _serialize(doc, full=True)


async def mark_subscription_payment_paid_once(
    payment_id: str,
    *,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    paid_at: datetime,
    renewal_due: str,
    session=None,
) -> tuple[bool, dict | None]:
    """
    Atomically transition a renewal payment to paid.
    Returns (changed, payment_after).
    """
    oid = _object_id(payment_id)
    if not oid:
        return False, None

    existing = await payment_collection.find_one({"_id": oid}, session=session)
    if not existing:
        return False, None

    if existing.get("payment_status") == PAYMENT_STATUS_PAID:
        return False, _serialize(existing, full=True)

    # Reject if razorpay_payment_id already used on another paid record
    duplicate = await payment_collection.find_one(
        {
            "$or": [
                {"transaction_reference": razorpay_payment_id},
                {"razorpay_payment_id": razorpay_payment_id},
            ],
            "_id": {"$ne": oid},
            "payment_status": PAYMENT_STATUS_PAID,
        },
        session=session,
    )
    if duplicate:
        return False, None

    updated = await payment_collection.find_one_and_update(
        {
            "_id": oid,
            "payment_status": {"$nin": [PAYMENT_STATUS_PAID]},
        },
        {
            "$set": {
                "payment_status": PAYMENT_STATUS_PAID,
                "paid_at": paid_at,
                "transaction_reference": razorpay_payment_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
                "razorpay_order_id": razorpay_order_id,
                "renewal_due": renewal_due,
                "subscription_synced": False,
            }
        },
        return_document=ReturnDocument.AFTER,
        session=session,
    )
    if updated:
        return True, _serialize(updated, full=True)

    refreshed = await payment_collection.find_one({"_id": oid}, session=session)
    if refreshed and refreshed.get("payment_status") == PAYMENT_STATUS_PAID:
        return False, _serialize(refreshed, full=True)
    return False, None


async def mark_subscription_payment_failed_once(
    payment_id: str,
    *,
    session=None,
) -> tuple[bool, dict | None]:
    oid = _object_id(payment_id)
    if not oid:
        return False, None

    updated = await payment_collection.find_one_and_update(
        {
            "_id": oid,
            "payment_status": {"$nin": [PAYMENT_STATUS_PAID, PAYMENT_STATUS_FAILED]},
        },
        {"$set": {"payment_status": PAYMENT_STATUS_FAILED, "subscription_synced": False}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )
    if updated:
        return True, _serialize(updated, full=True)

    refreshed = await payment_collection.find_one({"_id": oid}, session=session)
    if refreshed:
        return False, _serialize(refreshed, full=True)
    return False, None


async def mark_subscription_payment_synced(
    payment_id: str,
    *,
    session=None,
) -> bool:
    oid = _object_id(payment_id)
    if not oid:
        return False
    result = await payment_collection.update_one(
        {"_id": oid, "payment_status": PAYMENT_STATUS_PAID},
        {
            "$set": {
                "subscription_synced": True,
                "renewal_completed_at": datetime.now(UTC),
            }
        },
        session=session,
    )
    return result.modified_count == 1 or result.matched_count == 1


async def _paginated_billing_query(
    query: dict,
    *,
    page: int | None,
    limit: int | None,
) -> dict:
    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await payment_collection.count_documents(query)
    pages = max(1, (total + safe_limit - 1) // safe_limit) if total else 1
    meta_page = min(safe_page, pages)

    items = []
    cursor = (
        payment_collection.find(query)
        .sort("created_at", -1)
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )
    async for doc in cursor:
        item = _billing_item(doc)
        if item:
            items.append(item)

    return paginated_response(
        items,
        total=total,
        page=meta_page,
        limit=safe_limit,
    )


async def get_payments_by_customer_paginated(
    customer_email: str,
    *,
    page: int | None = None,
    limit: int | None = None,
    subscription_id: str | None = None,
) -> dict:
    query: dict = {"customer_email": customer_email.lower()}
    if subscription_id and subscription_id.strip():
        query["subscription_id"] = subscription_id.strip()
    return await _paginated_billing_query(query, page=page, limit=limit)


async def get_payments_by_restaurant_paginated(
    restaurant_email: str,
    *,
    page: int | None = None,
    limit: int | None = None,
) -> dict:
    query = {"restaurant_email": restaurant_email.lower()}
    return await _paginated_billing_query(query, page=page, limit=limit)


async def list_subscription_payments_admin_paginated(
    *,
    q: str | None = None,
    payment_status: str | None = None,
    restaurant_email: str | None = None,
    customer_email: str | None = None,
    subscription_id: str | None = None,
    page: int | None = None,
    limit: int | None = None,
) -> dict:
    query: dict = {}

    if payment_status and payment_status.strip():
        query["payment_status"] = payment_status.strip().lower()

    if restaurant_email and restaurant_email.strip():
        query["restaurant_email"] = restaurant_email.strip().lower()

    if customer_email and customer_email.strip():
        query["customer_email"] = customer_email.strip().lower()

    if subscription_id and subscription_id.strip():
        query["subscription_id"] = subscription_id.strip()

    if q and q.strip():
        term = q.strip()
        query["$or"] = [
            {"customer_email": {"$regex": term, "$options": "i"}},
            {"restaurant_email": {"$regex": term, "$options": "i"}},
            {"subscription_id": {"$regex": term, "$options": "i"}},
            {"transaction_reference": {"$regex": term, "$options": "i"}},
            {"billing_period": {"$regex": term, "$options": "i"}},
        ]

    return await _paginated_billing_query(query, page=page, limit=limit)


async def get_payments_by_customer(customer_email: str) -> list[dict]:
    result = await get_payments_by_customer_paginated(
        customer_email,
        page=1,
        limit=100,
    )
    return result.get("items") or []


async def get_payments_by_restaurant(restaurant_email: str) -> list[dict]:
    result = await get_payments_by_restaurant_paginated(
        restaurant_email,
        page=1,
        limit=100,
    )
    return result.get("items") or []


async def list_subscription_payments_admin(
    *,
    q: str | None = None,
    payment_status: str | None = None,
    restaurant_email: str | None = None,
    customer_email: str | None = None,
    subscription_id: str | None = None,
) -> list[dict]:
    result = await list_subscription_payments_admin_paginated(
        q=q,
        payment_status=payment_status,
        restaurant_email=restaurant_email,
        customer_email=customer_email,
        subscription_id=subscription_id,
        page=1,
        limit=100,
    )
    return result.get("items") or []


async def get_admin_payment_summary() -> dict:
    pipeline = [
        {
            "$group": {
                "_id": "$payment_status",
                "count": {"$sum": 1},
                "total_amount": {"$sum": "$amount"},
            }
        }
    ]
    paid_revenue = 0.0
    paid_count = 0
    pending_count = 0
    failed_count = 0

    async for row in payment_collection.aggregate(pipeline):
        status = (row.get("_id") or "").lower()
        count = int(row.get("count") or 0)
        amount = float(row.get("total_amount") or 0)
        if status == PAYMENT_STATUS_PAID:
            paid_count = count
            paid_revenue = amount
        elif status in {PAYMENT_STATUS_PENDING, PAYMENT_STATUS_PROCESSING}:
            pending_count += count
        elif status == PAYMENT_STATUS_FAILED:
            failed_count = count

    return {
        "total_subscription_revenue": round(paid_revenue, 2),
        "paid_payments": paid_count,
        "pending_payments": pending_count,
        "failed_payments": failed_count,
    }


async def get_restaurant_revenue_summary(restaurant_email: str) -> dict:
    email = restaurant_email.lower()
    active_subscriptions = await database["subscriptions"].count_documents(
        {"restaurant_email": email, "status": "active"}
    )

    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    monthly_pipeline = [
        {
            "$match": {
                "restaurant_email": email,
                "payment_status": PAYMENT_STATUS_PAID,
                "paid_at": {"$gte": month_start},
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    monthly_revenue = 0.0
    async for row in payment_collection.aggregate(monthly_pipeline):
        monthly_revenue = float(row.get("total") or 0)

    pending_payments = await payment_collection.count_documents(
        {
            "restaurant_email": email,
            "payment_status": {"$in": [PAYMENT_STATUS_PENDING, PAYMENT_STATUS_PROCESSING]},
        }
    )

    return {
        "active_subscriptions": active_subscriptions,
        "monthly_subscription_revenue": round(monthly_revenue, 2),
        "pending_subscription_payments": pending_payments,
    }
