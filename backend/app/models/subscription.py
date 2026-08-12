from __future__ import annotations

from datetime import UTC, date, datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.db.database import database

subscription_collection = database["subscriptions"]

VALID_STATUSES = {"active", "paused", "expired", "cancelled"}


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


def _serialize(doc: dict | None) -> dict | None:
    if not doc:
        return None
    result = dict(doc)
    result["subscription_id"] = str(result.pop("_id"))
    for key in (
        "start_date",
        "end_date",
        "pause_from",
        "pause_to",
        "created_at",
        "updated_at",
    ):
        value = result.get(key)
        if isinstance(value, datetime):
            result[key] = value.date().isoformat() if key.startswith(("start", "end", "pause")) else value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
    skipped = result.get("skipped_dates") or []
    result["skipped_dates"] = [
        item.isoformat() if isinstance(item, (date, datetime)) else str(item)
        for item in skipped
    ]
    return result


def _normalize_dates_for_storage(data: dict) -> dict:
    payload = dict(data)
    for key in ("start_date", "end_date", "pause_from", "pause_to"):
        if key in payload and payload[key] is not None:
            parsed = _parse_date(payload[key])
            if parsed:
                payload[key] = parsed.isoformat()
    if "skipped_dates" in payload:
        payload["skipped_dates"] = [
            _parse_date(item).isoformat() if _parse_date(item) else str(item)
            for item in (payload.get("skipped_dates") or [])
        ]
    return payload


async def create_subscription(data: dict) -> str:
    now = datetime.now(UTC)
    payload = _normalize_dates_for_storage(data)
    payload.setdefault("status", "active")
    payload.setdefault("skipped_dates", [])
    payload.setdefault("pause_from", None)
    payload.setdefault("pause_to", None)
    payload["created_at"] = now
    payload["updated_at"] = now
    result = await subscription_collection.insert_one(payload)
    return str(result.inserted_id)


async def get_subscription_by_id(subscription_id: str, *, session=None) -> dict | None:
    oid = _object_id(subscription_id)
    if not oid:
        return None
    doc = await subscription_collection.find_one({"_id": oid}, session=session)
    return _serialize(doc)


async def get_subscriptions_by_customer(customer_email: str) -> list[dict]:
    results = []
    cursor = subscription_collection.find(
        {"customer_email": customer_email.lower()}
    ).sort("created_at", -1)
    async for doc in cursor:
        serialized = _serialize(doc)
        if serialized:
            results.append(serialized)
    return results


async def get_subscriptions_by_restaurant(restaurant_email: str) -> list[dict]:
    results = []
    cursor = subscription_collection.find(
        {"restaurant_email": restaurant_email.lower()}
    ).sort("created_at", -1)
    async for doc in cursor:
        serialized = _serialize(doc)
        if serialized:
            results.append(serialized)
    return results


async def list_subscriptions_admin(
    *,
    q: str | None = None,
    status: str | None = None,
    restaurant_email: str | None = None,
    customer_email: str | None = None,
) -> list[dict]:
    query: dict = {}
    if status and status.strip().lower() in VALID_STATUSES:
        query["status"] = status.strip().lower()
    if restaurant_email and restaurant_email.strip():
        query["restaurant_email"] = restaurant_email.strip().lower()
    if customer_email and customer_email.strip():
        query["customer_email"] = customer_email.strip().lower()
    if q and q.strip():
        term = q.strip()
        query["$or"] = [
            {"customer_email": {"$regex": term, "$options": "i"}},
            {"restaurant_email": {"$regex": term, "$options": "i"}},
            {"subscription_id": {"$regex": term, "$options": "i"}},
        ]

    results = []
    cursor = subscription_collection.find(query).sort("created_at", -1)
    async for doc in cursor:
        serialized = _serialize(doc)
        if serialized:
            results.append(serialized)
    return results


async def update_subscription(
    subscription_id: str,
    updates: dict,
    *,
    session=None,
) -> bool:
    oid = _object_id(subscription_id)
    if not oid:
        return False
    payload = _normalize_dates_for_storage(updates)
    payload["updated_at"] = datetime.now(UTC)
    result = await subscription_collection.update_one(
        {"_id": oid},
        {"$set": payload},
        session=session,
    )
    return result.modified_count == 1 or result.matched_count == 1


async def apply_subscription_renewal_once(
    subscription_id: str,
    *,
    renewal_end: str,
    renewal_start: str | None = None,
    session=None,
) -> tuple[str, dict | None]:
    """
    Atomically extend a subscription for a paid renewal.
    Returns (outcome, subscription) where outcome is changed|already_applied|not_found.
    """
    from pymongo import ReturnDocument

    oid = _object_id(subscription_id)
    if not oid:
        return "not_found", None

    renewal_end_date = str(renewal_end)[:10]
    existing = await subscription_collection.find_one({"_id": oid}, session=session)
    if not existing:
        return "not_found", None

    current_end = str(existing.get("end_date") or "")[:10]
    current_payment_status = (existing.get("payment_status") or "").lower()
    if current_end >= renewal_end_date and current_payment_status == "paid":
        return "already_applied", _serialize(existing)

    updates: dict = {
        "payment_status": "paid",
        "end_date": renewal_end_date,
        "updated_at": datetime.now(UTC),
    }
    if renewal_start:
        updates["start_date"] = str(renewal_start)[:10]

    today = date.today()
    status = (existing.get("status") or "").lower()
    if status in {"expired", "paused"} or (
        current_end and date.fromisoformat(current_end) < today
    ):
        if date.fromisoformat(renewal_end_date) >= today:
            updates["status"] = "active"
            updates["pause_from"] = None
            updates["pause_to"] = None

    updated = await subscription_collection.find_one_and_update(
        {
            "_id": oid,
            "$or": [
                {"end_date": {"$lt": renewal_end_date}},
                {"payment_status": {"$ne": "paid"}},
            ],
        },
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
        session=session,
    )
    if updated:
        return "changed", _serialize(updated)

    refreshed = await subscription_collection.find_one({"_id": oid}, session=session)
    if not refreshed:
        return "not_found", None
    if str(refreshed.get("end_date") or "")[:10] >= renewal_end_date:
        return "already_applied", _serialize(refreshed)
    return "not_found", _serialize(refreshed)


def subscription_matches_renewal(subscription: dict, payment: dict) -> bool:
    renewal_end = str(payment.get("renewal_end") or payment.get("renewal_due") or "")[:10]
    if not renewal_end:
        return False
    current_end = str(subscription.get("end_date") or "")[:10]
    payment_status = (subscription.get("payment_status") or "").lower()
    return current_end >= renewal_end and payment_status == "paid"


async def get_active_subscriptions() -> list[dict]:
    results = []
    cursor = subscription_collection.find({"status": "active"})
    async for doc in cursor:
        serialized = _serialize(doc)
        if serialized:
            results.append(serialized)
    return results


async def enrich_subscriptions_with_plans(subscriptions: list[dict]) -> list[dict]:
    from app.models.subscription_plan import get_plan_by_id

    enriched = []
    for subscription in subscriptions:
        item = dict(subscription)
        if item.get("plan_id") and (
            not item.get("start_time") or not item.get("plan_name")
        ):
            plan = await get_plan_by_id(item["plan_id"])
            if plan:
                item.setdefault("plan_name", plan.get("name"))
                item.setdefault("start_time", plan.get("start_time"))
                item.setdefault("end_time", plan.get("end_time"))
        enriched.append(item)
    return enriched
