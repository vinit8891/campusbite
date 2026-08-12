from __future__ import annotations

from datetime import UTC, datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.db.database import database

plan_collection = database["subscription_plans"]


def _object_id(value: str):
    try:
        return ObjectId(value)
    except InvalidId:
        return None


def _serialize(doc: dict | None) -> dict | None:
    if not doc:
        return None
    result = dict(doc)
    result["plan_id"] = str(result.pop("_id"))
    for key in ("created_at", "updated_at"):
        value = result.get(key)
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


async def create_plan(data: dict) -> str:
    now = datetime.now(UTC)
    payload = dict(data)
    payload["restaurant_email"] = payload["restaurant_email"].lower()
    payload.setdefault("active", True)
    payload["created_at"] = now
    payload["updated_at"] = now
    result = await plan_collection.insert_one(payload)
    return str(result.inserted_id)


async def get_plan_by_id(plan_id: str) -> dict | None:
    oid = _object_id(plan_id)
    if not oid:
        return None
    doc = await plan_collection.find_one({"_id": oid})
    return _serialize(doc)


async def get_plans_by_restaurant(
    restaurant_email: str,
    *,
    active_only: bool = False,
    q: str | None = None,
) -> list[dict]:
    query: dict = {"restaurant_email": restaurant_email.lower()}
    if active_only:
        query["active"] = True
    if q and q.strip():
        term = q.strip()
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}},
            {"meal_type": {"$regex": term, "$options": "i"}},
        ]

    results = []
    cursor = plan_collection.find(query).sort("created_at", -1)
    async for doc in cursor:
        serialized = _serialize(doc)
        if serialized:
            results.append(serialized)
    return results


async def list_plans_admin(
    *,
    q: str | None = None,
    restaurant_email: str | None = None,
    active: bool | None = None,
) -> list[dict]:
    query: dict = {}
    if restaurant_email and restaurant_email.strip():
        query["restaurant_email"] = restaurant_email.strip().lower()
    if active is not None:
        query["active"] = active
    if q and q.strip():
        term = q.strip()
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}},
            {"restaurant_email": {"$regex": term, "$options": "i"}},
        ]

    results = []
    cursor = plan_collection.find(query).sort("created_at", -1)
    async for doc in cursor:
        serialized = _serialize(doc)
        if serialized:
            results.append(serialized)
    return results


async def update_plan(plan_id: str, updates: dict) -> bool:
    oid = _object_id(plan_id)
    if not oid:
        return False
    payload = {k: v for k, v in updates.items() if v is not None}
    payload["updated_at"] = datetime.now(UTC)
    result = await plan_collection.update_one({"_id": oid}, {"$set": payload})
    return result.modified_count == 1 or result.matched_count == 1


async def delete_plan(plan_id: str) -> bool:
    oid = _object_id(plan_id)
    if not oid:
        return False
    result = await plan_collection.delete_one({"_id": oid})
    return result.deleted_count == 1
