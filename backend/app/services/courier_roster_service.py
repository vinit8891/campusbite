"""Courier Mess Wave Shift Roster & T-20 Priority Batch Dispatch Engine.

Enables delivery partners to claim guaranteed lunch & dinner wave shift runs
up to 24h ahead and clusters hostel lobby deliveries with ₹20 base + ₹10 add-on payout.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta, timezone
from typing import Any
from bson import ObjectId

from app.db.database import database
from app.services.batch_scheduler import CAMPUS_WAVE_SLOTS, IST_OFFSET
from app.payments.amounts import (
    RIDER_BASE_PAYOUT,
    RIDER_BATCH_ADDON_PAYOUT,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

ROSTER_COLLECTION = "courier_shift_reservations"


def get_current_ist_date() -> str:
    return datetime.now(IST_OFFSET).strftime("%Y-%m-%d")


def get_tomorrow_ist_date() -> str:
    return (datetime.now(IST_OFFSET) + timedelta(days=1)).strftime("%Y-%m-%d")


async def get_available_shift_slots(
    courier_phone: str | None = None,
    target_date: str | None = None,
) -> list[dict[str, Any]]:
    """
    Returns available mess shift wave slots with reservation state for courier.
    """
    date_str = target_date or get_current_ist_date()
    now_ist = datetime.now(IST_OFFSET)

    # Get courier's reservations for this date
    courier_reservations = []
    if courier_phone:
        async for r in database[ROSTER_COLLECTION].find({
            "courier_phone": courier_phone,
            "shift_date": date_str,
            "status": {"$in": ["CONFIRMED", "CHECKED_IN"]},
        }):
            courier_reservations.append(r)

    reserved_slot_ids = {r["wave_slot_id"] for r in courier_reservations}

    results = []
    for slot in CAMPUS_WAVE_SLOTS:
        slot_id = slot["slot_id"]
        # Check total reservations for this slot
        reserved_count = await database[ROSTER_COLLECTION].count_documents({
            "wave_slot_id": slot_id,
            "shift_date": date_str,
            "status": {"$in": ["CONFIRMED", "CHECKED_IN"]},
        })

        is_reserved_by_me = slot_id in reserved_slot_ids
        my_res = next((r for r in courier_reservations if r["wave_slot_id"] == slot_id), None)

        # Calculate minutes until cutoff
        slot_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        cutoff_dt = datetime(
            slot_date.year,
            slot_date.month,
            slot_date.day,
            slot["cutoff_hour"],
            slot["cutoff_minute"],
            tzinfo=IST_OFFSET,
        )
        mins_remaining = max(0, int((cutoff_dt - now_ist).total_seconds() / 60))
        is_past_cutoff = (cutoff_dt < now_ist) if date_str == get_current_ist_date() else False

        results.append({
            "wave_slot_id": slot_id,
            "label": slot["label"],
            "delivery_window": slot["delivery_window"],
            "shift_date": date_str,
            "cutoff_time": f"{slot['cutoff_hour']:02d}:{slot['cutoff_minute']:02d} IST",
            "minutes_until_cutoff": mins_remaining,
            "is_past_cutoff": is_past_cutoff,
            "guaranteed_base_payout": RIDER_BASE_PAYOUT,
            "addon_payout_per_order": RIDER_BATCH_ADDON_PAYOUT,
            "expected_payout_range": f"₹{int(RIDER_BASE_PAYOUT)} – ₹{int(RIDER_BASE_PAYOUT + RIDER_BATCH_ADDON_PAYOUT * 4)}",
            "capacity": 5,
            "reserved_count": reserved_count,
            "is_available": reserved_count < 5 and not is_past_cutoff and not is_reserved_by_me,
            "is_reserved_by_me": is_reserved_by_me,
            "reservation_id": str(my_res["_id"]) if my_res else None,
            "status": my_res["status"] if my_res else ("FULL" if reserved_count >= 5 else "AVAILABLE"),
        })

    return results


async def reserve_courier_shift(
    courier_id: str,
    courier_phone: str,
    courier_name: str,
    wave_slot_id: str,
    shift_date: str | None = None,
    hostel_block: str | None = None,
) -> dict[str, Any]:
    """
    Reserves a mess shift run for courier up to 24h in advance.
    """
    date_str = shift_date or get_current_ist_date()
    slot = next((s for s in CAMPUS_WAVE_SLOTS if s["slot_id"] == wave_slot_id), None)
    if not slot:
        raise ValueError(f"Invalid wave slot ID: {wave_slot_id}")

    # Check if courier already has confirmed reservation for this slot and date
    existing = await database[ROSTER_COLLECTION].find_one({
        "courier_phone": courier_phone,
        "wave_slot_id": wave_slot_id,
        "shift_date": date_str,
        "status": {"$in": ["CONFIRMED", "CHECKED_IN"]},
    })
    if existing:
        return {
            "success": True,
            "message": "Shift already reserved",
            "reservation_id": str(existing["_id"]),
            "status": existing["status"],
        }

    # Capacity check (max 5 couriers per wave)
    count = await database[ROSTER_COLLECTION].count_documents({
        "wave_slot_id": wave_slot_id,
        "shift_date": date_str,
        "status": {"$in": ["CONFIRMED", "CHECKED_IN"]},
    })
    if count >= 5:
        raise ValueError("Shift slot is at full capacity (5/5 couriers reserved).")

    now = datetime.now(UTC)
    doc = {
        "courier_id": courier_id,
        "courier_phone": courier_phone,
        "courier_name": courier_name or f"Rider {courier_phone[-4:]}",
        "wave_slot_id": wave_slot_id,
        "slot_label": slot["label"],
        "delivery_window": slot["delivery_window"],
        "shift_date": date_str,
        "hostel_block": hostel_block or "All Campus Hostels",
        "status": "CONFIRMED",
        "base_payout": RIDER_BASE_PAYOUT,
        "addon_payout": RIDER_BATCH_ADDON_PAYOUT,
        "created_at": now,
        "updated_at": now,
    }

    res = await database[ROSTER_COLLECTION].insert_one(doc)
    doc["_id"] = str(res.inserted_id)

    return {
        "success": True,
        "message": f"Successfully reserved {slot['label']} for {date_str}",
        "reservation_id": str(res.inserted_id),
        "reservation": doc,
    }


async def get_my_shift_reservations(courier_phone: str) -> list[dict[str, Any]]:
    """
    Returns active and past shift reservations for courier.
    """
    results = []
    cursor = database[ROSTER_COLLECTION].find({
        "courier_phone": courier_phone,
    }).sort("created_at", -1)

    async for doc in cursor:
        d = dict(doc)
        d["reservation_id"] = str(d.pop("_id"))
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        if isinstance(d.get("updated_at"), datetime):
            d["updated_at"] = d["updated_at"].isoformat()
        results.append(d)

    return results


async def cancel_shift_reservation(reservation_id: str, courier_phone: str) -> bool:
    """
    Releases a confirmed shift reservation.
    """
    try:
        oid = ObjectId(reservation_id)
    except Exception:
        return False

    res = await database[ROSTER_COLLECTION].update_one(
        {
            "_id": oid,
            "courier_phone": courier_phone,
            "status": {"$in": ["CONFIRMED", "CHECKED_IN"]},
        },
        {"$set": {"status": "RELEASED", "updated_at": datetime.now(UTC)}},
    )
    return res.modified_count == 1


async def check_and_execute_t20_roster_dispatch(
    shift_date: str | None = None,
    wave_slot_id: str | None = None,
) -> dict[str, Any]:
    """
    T-20 Minute Pre-Wave On-Duty Audit:
    - If reserved courier is NOT online, release reservation and flag batch as 'is_priority_mess_batch: True'
    - If reserved courier is online, mark status 'CHECKED_IN'
    """
    date_str = shift_date or get_current_ist_date()
    query: dict[str, Any] = {
        "shift_date": date_str,
        "status": "CONFIRMED",
    }
    if wave_slot_id:
        query["wave_slot_id"] = wave_slot_id

    checked_in_count = 0
    released_count = 0
    priority_broadcasts = []

    cursor = database[ROSTER_COLLECTION].find(query)
    async for res in cursor:
        phone = res["courier_phone"]
        partner = await database["delivery_partners"].find_one({"phone": phone})
        is_online = (partner or {}).get("online", False)

        if is_online:
            await database[ROSTER_COLLECTION].update_one(
                {"_id": res["_id"]},
                {"$set": {"status": "CHECKED_IN", "checked_in_at": datetime.now(UTC)}},
            )
            checked_in_count += 1
        else:
            # Rider is offline at T-20: Release slot and trigger priority broadcast
            await database[ROSTER_COLLECTION].update_one(
                {"_id": res["_id"]},
                {
                    "$set": {
                        "status": "RELEASED",
                        "release_reason": "Offline at T-20 cutoff",
                        "updated_at": datetime.now(UTC),
                    }
                },
            )
            released_count += 1
            priority_broadcasts.append({
                "wave_slot_id": res["wave_slot_id"],
                "slot_label": res.get("slot_label", "Mess Wave"),
                "shift_date": date_str,
                "is_priority_mess_batch": True,
                "released_courier_phone": phone,
            })

    return {
        "shift_date": date_str,
        "checked_in_count": checked_in_count,
        "released_count": released_count,
        "priority_broadcasts": priority_broadcasts,
    }


async def dispatch_clustered_mess_batch(
    restaurant_email: str,
    hostel_block: str,
    shift_date: str | None = None,
    wave_slot_id: str = "LUNCH_WAVE_1",
    assigned_courier_phone: str | None = None,
) -> dict[str, Any]:
    """
    Clusters all weekly subscriber deliveries for (restaurant_email, hostel_block) in a wave into a single batch run.
    Pays ₹20 base + ₹10 add-on per order.
    """
    date_str = shift_date or get_current_ist_date()
    clean_hostel = hostel_block.replace(" ", "")
    batch_id = f"MESS_BATCH_{date_str.replace('-', '')}_{wave_slot_id}_{clean_hostel}_{uuid.uuid4().hex[:6].upper()}"

    order_query = {
        "restaurant_email": restaurant_email.lower(),
        "hostel_block": hostel_block,
        "status": {"$in": ["Accepted", "Preparing", "Ready for Pickup"]},
        "$or": [
            {"subscription_order_date": date_str},
            {"delivery_type": "HOSTEL_BATCH"},
        ],
    }

    orders = []
    async for o in database["orders"].find(order_query):
        orders.append(o)

    if not orders:
        return {
            "success": False,
            "message": "No active orders found to cluster for this hostel block",
            "batch_id": None,
            "orders_count": 0,
            "total_payout": 0.0,
        }

    orders_count = len(orders)
    total_payout = RIDER_BASE_PAYOUT + max(0, orders_count - 1) * RIDER_BATCH_ADDON_PAYOUT

    # Update orders to link to this batch_id
    order_ids = [o["_id"] for o in orders]
    await database["orders"].update_many(
        {"_id": {"$in": order_ids}},
        {
            "$set": {
                "batch_id": batch_id,
                "batch_window_id": wave_slot_id,
                "is_priority_mess_batch": True,
                "calculated_payout": total_payout / orders_count,
                "updated_at": datetime.now(UTC),
            }
        },
    )

    return {
        "success": True,
        "message": f"Successfully clustered {orders_count} mess orders into {batch_id}",
        "batch_id": batch_id,
        "orders_count": orders_count,
        "base_payout": RIDER_BASE_PAYOUT,
        "addon_payout_per_order": RIDER_BATCH_ADDON_PAYOUT,
        "total_payout": total_payout,
        "assigned_courier_phone": assigned_courier_phone,
    }
