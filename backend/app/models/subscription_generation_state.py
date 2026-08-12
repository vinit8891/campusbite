"""Persist last subscription order generation run metadata."""

from __future__ import annotations

from datetime import UTC, date, datetime

from app.db.database import database

STATE_ID = "current"
state_collection = database["subscription_generation_state"]


def _serialize_state(doc: dict | None) -> dict:
    if not doc:
        return {
            "last_generation_time": None,
            "last_target_date": None,
            "last_generated_count": 0,
            "last_skipped_count": 0,
            "last_trigger": None,
        }

    result = dict(doc)
    result.pop("_id", None)
    last_at = result.get("last_generation_time")
    if isinstance(last_at, datetime):
        result["last_generation_time"] = last_at.isoformat()
    return result


async def record_generation_run(
    target_date: date,
    result: dict,
    *,
    trigger: str,
) -> None:
    payload = {
        "_id": STATE_ID,
        "last_generation_time": datetime.now(UTC),
        "last_target_date": target_date.isoformat(),
        "last_generated_count": int(result.get("generated_count") or 0),
        "last_skipped_count": int(result.get("skipped_count") or 0),
        "last_trigger": trigger,
    }
    await state_collection.update_one(
        {"_id": STATE_ID},
        {"$set": payload},
        upsert=True,
    )


async def get_generation_state() -> dict:
    doc = await state_collection.find_one({"_id": STATE_ID})
    return _serialize_state(doc)
