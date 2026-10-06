"""Automated Hostel Batch Window Scheduler & Wave Dispatch Engine.

Campus Delivery Wave Slots (IST):
- Lunch Waves: 12:45 PM – 1:15 PM, 1:15 PM – 1:45 PM
- Evening Snacks Wave: 5:15 PM – 5:45 PM
- Dinner Waves: 8:00 PM – 8:30 PM, 8:45 PM – 9:15 PM, 9:30 PM – 10:00 PM

Orders close 15 minutes before wave delivery window starts to give kitchens prep time.
"""

from __future__ import annotations

import math
import re
import uuid
from datetime import UTC, datetime, timedelta, timezone
from typing import Any

from app.db.database import database
from app.payments.amounts import (
    RIDER_BASE_PAYOUT,
    RIDER_BATCH_ADDON_PAYOUT,
    calculate_rider_payout,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

IST_OFFSET = timezone(timedelta(hours=5, minutes=30))

CAMPUS_WAVE_SLOTS = [
    {
        "slot_id": "LUNCH_WAVE_1",
        "label": "Lunch Wave 1",
        "start_hour": 12,
        "start_minute": 45,
        "end_hour": 13,
        "end_minute": 15,
        "cutoff_hour": 12,
        "cutoff_minute": 30,
        "delivery_window": "12:45 PM – 1:15 PM",
    },
    {
        "slot_id": "LUNCH_WAVE_2",
        "label": "Lunch Wave 2",
        "start_hour": 13,
        "start_minute": 15,
        "end_hour": 13,
        "end_minute": 45,
        "cutoff_hour": 13,
        "cutoff_minute": 0,
        "delivery_window": "1:15 PM – 1:45 PM",
    },
    {
        "slot_id": "SNACKS_WAVE_1",
        "label": "Evening Snacks Wave",
        "start_hour": 17,
        "start_minute": 15,
        "end_hour": 17,
        "end_minute": 45,
        "cutoff_hour": 17,
        "cutoff_minute": 0,
        "delivery_window": "5:15 PM – 5:45 PM",
    },
    {
        "slot_id": "DINNER_WAVE_1",
        "label": "Dinner Wave 1",
        "start_hour": 20,
        "start_minute": 0,
        "end_hour": 20,
        "end_minute": 30,
        "cutoff_hour": 19,
        "cutoff_minute": 45,
        "delivery_window": "8:00 PM – 8:30 PM",
    },
    {
        "slot_id": "DINNER_WAVE_2",
        "label": "Dinner Wave 2",
        "start_hour": 20,
        "start_minute": 45,
        "end_hour": 21,
        "end_minute": 15,
        "cutoff_hour": 20,
        "cutoff_minute": 30,
        "delivery_window": "8:45 PM – 9:15 PM",
    },
    {
        "slot_id": "DINNER_WAVE_3",
        "label": "Dinner Wave 3",
        "start_hour": 21,
        "start_minute": 30,
        "end_hour": 22,
        "end_minute": 0,
        "cutoff_hour": 21,
        "cutoff_minute": 15,
        "delivery_window": "9:30 PM – 10:00 PM",
    },
]


def get_current_ist_time(d: datetime | None = None) -> datetime:
    """Returns IST datetime."""
    if d is None:
        return datetime.now(IST_OFFSET)
    if d.tzinfo is None:
        return d.replace(tzinfo=UTC).astimezone(IST_OFFSET)
    return d.astimezone(IST_OFFSET)


def get_next_batch_window(
    current_time: datetime | None = None,
    fulfillment_type: str = "HOSTEL_BATCH",
) -> dict[str, Any]:
    """
    Evaluates the next eligible batch delivery wave in IST.
    """
    ist = get_current_ist_time(current_time)
    current_total_mins = ist.hour * 60 + ist.minute

    # 1. Search for upcoming wave today before cutoff
    for slot in CAMPUS_WAVE_SLOTS:
        cutoff_total_mins = slot["cutoff_hour"] * 60 + slot["cutoff_minute"]
        if cutoff_total_mins > current_total_mins:
            cutoff_dt = ist.replace(
                hour=slot["cutoff_hour"],
                minute=slot["cutoff_minute"],
                second=0,
                microsecond=0,
            )
            diff_seconds = (cutoff_dt - ist).total_seconds()
            minutes_remaining = max(1, math.ceil(diff_seconds / 60))

            return {
                "slot_id": slot["slot_id"],
                "slotId": slot["slot_id"],
                "label": slot["label"],
                "cutoff_time": cutoff_dt.isoformat(),
                "cutoffTime": cutoff_dt.isoformat(),
                "delivery_window": slot["delivery_window"],
                "deliveryWindow": slot["delivery_window"],
                "minutes_remaining": minutes_remaining,
                "minutesRemaining": minutes_remaining,
                "is_rolling": False,
                "isRolling": False,
                "scheduled_wave": f"{slot['label']} ({slot['delivery_window']})",
                "scheduledWave": f"{slot['label']} ({slot['delivery_window']})",
            }

    # 2. Past all waves today (after 9:15 PM IST):
    first_slot = CAMPUS_WAVE_SLOTS[0]
    tomorrow_dt = ist + timedelta(days=1)
    tomorrow_cutoff_dt = tomorrow_dt.replace(
        hour=first_slot["cutoff_hour"],
        minute=first_slot["cutoff_minute"],
        second=0,
        microsecond=0,
    )
    diff_seconds = (tomorrow_cutoff_dt - ist).total_seconds()
    minutes_remaining = max(1, math.ceil(diff_seconds / 60))

    if ist.hour >= 22 or ist.hour < 11:
        return {
            "slot_id": first_slot["slot_id"],
            "slotId": first_slot["slot_id"],
            "label": f"Tomorrow's {first_slot['label']}",
            "cutoff_time": tomorrow_cutoff_dt.isoformat(),
            "cutoffTime": tomorrow_cutoff_dt.isoformat(),
            "delivery_window": f"Tomorrow {first_slot['delivery_window']}",
            "deliveryWindow": f"Tomorrow {first_slot['delivery_window']}",
            "minutes_remaining": minutes_remaining,
            "minutesRemaining": minutes_remaining,
            "is_rolling": False,
            "isRolling": False,
            "scheduled_wave": f"Tomorrow {first_slot['label']} ({first_slot['delivery_window']})",
            "scheduledWave": f"Tomorrow {first_slot['label']} ({first_slot['delivery_window']})",
        }

    # 3. Fallback: 30-min rolling batch window
    rolling_cutoff = ist + timedelta(minutes=15)
    rolling_start = ist + timedelta(minutes=30)
    rolling_end = ist + timedelta(minutes=50)

    start_str = rolling_start.strftime("%I:%M %p").lstrip("0")
    end_str = rolling_end.strftime("%I:%M %p").lstrip("0")

    return {
        "slot_id": "ROLLING_BATCH",
        "slotId": "ROLLING_BATCH",
        "label": "Immediate Rolling Batch",
        "cutoff_time": rolling_cutoff.isoformat(),
        "cutoffTime": rolling_cutoff.isoformat(),
        "delivery_window": f"{start_str} – {end_str}",
        "deliveryWindow": f"{start_str} – {end_str}",
        "minutes_remaining": 15,
        "minutesRemaining": 15,
        "is_rolling": True,
        "isRolling": True,
        "scheduled_wave": f"Rolling Batch ({start_str} – {end_str})",
        "scheduledWave": f"Rolling Batch ({start_str} – {end_str})",
    }


async def find_or_create_batch_for_order(order_data: dict[str, Any]) -> dict[str, Any]:
    """
    Groups incoming HOSTEL_BATCH orders by (hostel_block, canteen_id/email, batch_window_id).
    - If an open batch exists for this tuple, attaches to that batch_id with is_batch_addon = True.
    - If no open batch exists, creates a new batch_id with is_batch_addon = False (primary drop).
    """
    delivery_type = str(order_data.get("delivery_type") or "").strip().upper()
    if delivery_type not in ("HOSTEL_BATCH", "BATCH"):
        return {
            "is_batch_addon": False,
            "batch_id": None,
            "batch_window_id": None,
            "scheduled_wave": None,
            "calculated_payout": calculate_rider_payout(
                is_batch_addon=False,
                tip_amount=float(order_data.get("tip_amount") or 0.0),
                is_takeaway=delivery_type in ("COUNTER_TAKEAWAY", "TAKEAWAY", "PICKUP"),
            ),
        }

    hostel_block = str(order_data.get("hostel_block") or "").strip()
    if not hostel_block:
        address = str(order_data.get("address") or "")
        # Extract hostel block from address if mentioned
        for block in ["Block A", "Block B", "Block C", "Block D", "Hostel 1", "Hostel 2", "Hostel 3", "Hostel 4", "Girls Hostel", "Boys Hostel"]:
            if block.lower() in address.lower():
                hostel_block = block
                break
        if not hostel_block:
            hostel_block = "Hostel Common Lobby"

    canteen_key = str(
        order_data.get("restaurant_email")
        or order_data.get("restaurant_id")
        or order_data.get("restaurant_name")
        or ""
    ).strip().lower()

    batch_window_info = get_next_batch_window()
    batch_window_id = str(order_data.get("batch_window_id") or batch_window_info["slot_id"])
    scheduled_wave = str(order_data.get("scheduled_wave") or batch_window_info["scheduled_wave"])

    # Query for open/active orders in the same wave tuple:
    # (hostel_block, restaurant_email, batch_window_id)
    today_ist_str = get_current_ist_time().strftime("%Y-%m-%d")

    query: dict[str, Any] = {
        "delivery_type": {"$in": ["HOSTEL_BATCH", "BATCH", "hostel_batch"]},
        "hostel_block": hostel_block,
        "batch_window_id": batch_window_id,
        "status": {
            "$in": [
                "Pending",
                "Accepted",
                "Preparing",
                "Ready for Pickup",
                "Assigned",
                "pending",
                "accepted",
                "preparing",
                "ready for pickup",
                "assigned",
            ]
        },
    }

    if canteen_key:
        query["$or"] = [
            {"restaurant_email": canteen_key},
            {"restaurant_email": {"$regex": f"^{re.escape(canteen_key)}$", "$options": "i"}},
            {"restaurant_id": canteen_key},
            {"restaurant_name": canteen_key},
        ]

    existing_order = await database["orders"].find_one(query)

    tip_amount = float(order_data.get("tip_amount") or 0.0)

    if existing_order and existing_order.get("batch_id"):
        batch_id = str(existing_order["batch_id"])
        is_batch_addon = True
        calculated_payout = calculate_rider_payout(
            is_batch_addon=True,
            tip_amount=tip_amount,
            is_takeaway=False,
        )
    else:
        # Generate new batch id
        clean_block = "".join(c for c in hostel_block if c.isalnum())
        clean_canteen = canteen_key.split("@")[0].replace(".", "")[:8]
        batch_id = f"BATCH_{today_ist_str}_{clean_block}_{clean_canteen}_{uuid.uuid4().hex[:6].upper()}"
        is_batch_addon = False
        calculated_payout = calculate_rider_payout(
            is_batch_addon=False,
            tip_amount=tip_amount,
            is_takeaway=False,
        )

    return {
        "batch_id": batch_id,
        "is_batch_addon": is_batch_addon,
        "batch_window_id": batch_window_id,
        "hostel_block": hostel_block,
        "scheduled_wave": scheduled_wave,
        "calculated_payout": calculated_payout,
    }
