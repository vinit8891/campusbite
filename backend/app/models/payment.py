"""Mongo persistence for payment attempts and refunds."""

from datetime import datetime, UTC

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from app.db.database import database
from app.models.order import get_object_id, order_collection

payment_collection = database["payments"]
refund_collection = database["refunds"]
webhook_event_collection = database["razorpay_webhook_events"]


async def ensure_payment_indexes():
    await payment_collection.create_index("order_id")
    await payment_collection.create_index("razorpay_order_id", sparse=True)
    await payment_collection.create_index(
        [("idempotency_key", 1)],
        unique=True,
        sparse=True,
    )
    await refund_collection.create_index("order_id")
    await refund_collection.create_index(
        [("idempotency_key", 1)],
        unique=True,
        sparse=True,
    )
    await webhook_event_collection.create_index("event_id", unique=True)
    await webhook_event_collection.create_index("created_at")


async def claim_webhook_event(event_id: str, event_name: str | None = None) -> bool:
    """
    Idempotent webhook claim.
    Returns True if this is the first time we see event_id, False if duplicate.
    """
    if not event_id:
        return True

    existing = await webhook_event_collection.find_one({"event_id": event_id})
    if existing:
        return False

    try:
        await webhook_event_collection.insert_one(
            {
                "event_id": event_id,
                "event_name": event_name,
                "created_at": datetime.now(UTC),
            }
        )
        return True
    except DuplicateKeyError:
        return False



def _stringify(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def create_payment_attempt(data: dict) -> str:
    payload = dict(data)
    payload["created_at"] = datetime.now(UTC)
    payload["updated_at"] = datetime.now(UTC)
    result = await payment_collection.insert_one(payload)
    return str(result.inserted_id)


async def get_payment_by_id(payment_id: str) -> dict | None:
    try:
        oid = ObjectId(payment_id)
    except InvalidId:
        return None
    return _stringify(await payment_collection.find_one({"_id": oid}))


async def get_payment_by_order_id(order_id: str) -> dict | None:
    doc = await payment_collection.find_one(
        {"order_id": order_id},
        sort=[("created_at", -1)],
    )
    return _stringify(doc)


async def get_payment_by_razorpay_order_id(razorpay_order_id: str) -> dict | None:
    return _stringify(
        await payment_collection.find_one(
            {"razorpay_order_id": razorpay_order_id}
        )
    )


async def get_payment_by_idempotency_key(key: str) -> dict | None:
    return _stringify(
        await payment_collection.find_one({"idempotency_key": key})
    )


async def update_payment_attempt(payment_id: str, updates: dict) -> bool:
    try:
        oid = ObjectId(payment_id)
    except InvalidId:
        return False
    payload = dict(updates)
    payload["updated_at"] = datetime.now(UTC)
    result = await payment_collection.update_one(
        {"_id": oid},
        {"$set": payload},
    )
    return result.matched_count == 1


async def update_order_payment_fields(order_id: str, updates: dict) -> bool:
    oid = get_object_id(order_id)
    if not oid:
        return False
    payload = dict(updates)
    payload["payment_updated_at"] = datetime.now(UTC)
    result = await order_collection.update_one(
        {"_id": oid},
        {"$set": payload},
    )
    return result.matched_count == 1


async def mark_order_paid_once(
    order_id: str,
    *,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str | None,
    amount_paise: int,
) -> tuple[bool, dict | None]:
    """
    Idempotent paid transition.
    Returns (changed, order_after).
    """
    oid = get_object_id(order_id)
    if not oid:
        return False, None

    now = datetime.now(UTC)
    # Only transition from non-paid states; already-paid is a no-op success
    existing = await order_collection.find_one({"_id": oid})
    if not existing:
        return False, None

    if existing.get("payment_status") == "paid":
        existing["_id"] = str(existing["_id"])
        return False, existing

    result = await order_collection.update_one(
        {
            "_id": oid,
            "payment_status": {"$nin": ["paid", "refunded", "partially_refunded"]},
        },
        {
            "$set": {
                "payment_method": "online",
                "payment_status": "paid",
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
                "amount_paise": amount_paise,
                "paid_at": now,
                "payment_updated_at": now,
            }
        },
    )

    order = await order_collection.find_one({"_id": oid})
    if order:
        order["_id"] = str(order["_id"])
    return result.modified_count == 1, order


async def create_refund_record(data: dict) -> str:
    payload = dict(data)
    payload["created_at"] = datetime.now(UTC)
    payload["updated_at"] = datetime.now(UTC)
    result = await refund_collection.insert_one(payload)
    return str(result.inserted_id)


async def update_refund_record(refund_id: str, updates: dict) -> bool:
    try:
        oid = ObjectId(refund_id)
    except InvalidId:
        return False
    payload = dict(updates)
    payload["updated_at"] = datetime.now(UTC)
    result = await refund_collection.update_one(
        {"_id": oid},
        {"$set": payload},
    )
    return result.matched_count == 1


async def get_refund_by_id(refund_id: str) -> dict | None:
    try:
        oid = ObjectId(refund_id)
    except InvalidId:
        return None
    return _stringify(await refund_collection.find_one({"_id": oid}))


async def get_refund_by_idempotency_key(key: str) -> dict | None:
    return _stringify(
        await refund_collection.find_one({"idempotency_key": key})
    )


async def list_refunds_for_order(order_id: str) -> list[dict]:
    rows = []
    async for doc in refund_collection.find({"order_id": order_id}).sort(
        "created_at", -1
    ):
        rows.append(_stringify(doc))
    return rows
