"""Automated Batch Delivery Clustering and Wave Optimization Engine.

Provides algorithmic clustering of student delivery orders across campus hostel blocks:
- Clusters orders by (hostel_block, canteen_id, batch_window_id) or spatial proximity.
- Calculates multi-drop courier wages: Base drop fee (₹20.00) + Batch add-on drops (+₹14.00 each) + 100% Tips.
- Integrates with wave dispatch time-slots (Lunch, Snacks, Dinner waves in IST).
"""

from __future__ import annotations

import math
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.db.database import database
from app.payments.amounts import (
    RIDER_BASE_PAYOUT,
    RIDER_BATCH_ADDON_PAYOUT,
    calculate_batch_rider_earnings,
    calculate_rider_payout,
)
from app.services.batch_scheduler import (
    CAMPUS_WAVE_SLOTS,
    find_or_create_batch_for_order,
    get_current_ist_time,
    get_next_batch_window,
)

logger = get_logger(__name__)

# Campus hostel coordinates benchmark for spatial clustering
CAMPUS_HOSTEL_COORDINATES: dict[str, tuple[float, float]] = {
    "Hostel Block A": (18.4485, 73.8267),
    "Hostel Block B": (18.4489, 73.8271),
    "Hostel Block C": (18.4481, 73.8263),
    "Boys Hostel 1 Gate": (18.4482, 73.8265),
    "Boys Hostel 2 Gate": (18.4488, 73.8270),
    "Girls Hostel Reception": (18.4475, 73.8258),
    "Central Library Porch": (18.4490, 73.8260),
    "Engineering Building Front": (18.4495, 73.8265),
    "Zeal Polytechnic Lawn": (18.4480, 73.8275),
    "Zeal Main Canteen Pickup": (18.4485, 73.8267),
}


def normalize_cluster_key(hostel_block: str | None, canteen_key: str | None, window_id: str | None) -> str:
    """Normalizes clustering key tuple into a canonical string."""
    clean_hostel = str(hostel_block or "Hostel Common").strip().lower()
    clean_canteen = str(canteen_key or "default_canteen").strip().lower()
    clean_window = str(window_id or "CURRENT_WAVE").strip().upper()
    return f"{clean_hostel}::{clean_canteen}::{clean_window}"


def cluster_orders_into_batches(orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Algorithmically clusters a list of delivery orders into efficient runner batches.

    Returns a list of batch clusters containing:
    - batch_id: generated or assigned batch ID
    - hostel_block: destination hostel / campus building
    - canteen_key: source canteen identifier
    - batch_window_id: active wave window slot
    - scheduled_wave: delivery window string
    - orders: list of clustered orders
    - total_orders: order count in this batch
    - total_wages: courier earnings for delivering this batch
    - coordinates: estimated cluster center (lat, lon)
    """
    if not orders:
        return []

    wave_window = get_next_batch_window()
    grouped_buckets: dict[str, list[dict[str, Any]]] = {}

    for order in orders:
        delivery_type = str(order.get("delivery_type") or "").strip().upper()
        fulfillment_mode = str(order.get("fulfillment_mode") or "").strip().lower()

        # Skip takeaway orders from batch clusters
        if fulfillment_mode == "takeaway" or delivery_type in ("COUNTER_TAKEAWAY", "TAKEAWAY", "PICKUP"):
            continue

        hostel = str(order.get("hostel_block") or "").strip()
        if not hostel:
            address = str(order.get("address") or "")
            for known in CAMPUS_HOSTEL_COORDINATES.keys():
                if known.lower() in address.lower():
                    hostel = known
                    break
            if not hostel:
                hostel = "Hostel Common Lobby"

        canteen = str(
            order.get("restaurant_email")
            or order.get("restaurant_id")
            or order.get("restaurant_name")
            or "campus_canteen"
        ).strip().lower()

        window_id = str(order.get("batch_window_id") or wave_window["slot_id"])
        key = normalize_cluster_key(hostel, canteen, window_id)

        if key not in grouped_buckets:
            grouped_buckets[key] = []
        grouped_buckets[key].append(order)

    today_str = get_current_ist_time().strftime("%Y%m%d")
    batches: list[dict[str, Any]] = []

    for key, cluster_orders in grouped_buckets.items():
        if not cluster_orders:
            continue

        first_order = cluster_orders[0]
        hostel_block = str(first_order.get("hostel_block") or "Hostel Block A")
        canteen_key = str(
            first_order.get("restaurant_email")
            or first_order.get("restaurant_id")
            or first_order.get("restaurant_name")
            or "canteen"
        )
        batch_window_id = str(first_order.get("batch_window_id") or wave_window["slot_id"])
        scheduled_wave = str(first_order.get("scheduled_wave") or wave_window["scheduled_wave"])

        existing_batch_id = first_order.get("batch_id")
        if existing_batch_id:
            batch_id = str(existing_batch_id)
        else:
            clean_hostel = "".join(c for c in hostel_block if c.isalnum())[:8]
            clean_canteen = canteen_key.split("@")[0].replace(".", "")[:8]
            batch_id = f"BATCH_{today_str}_{clean_hostel}_{clean_canteen}_{uuid.uuid4().hex[:5].upper()}"

        # Assign primary drop vs add-on drops
        enriched_orders: list[dict[str, Any]] = []
        total_tips = 0.0

        for idx, ord_item in enumerate(cluster_orders):
            is_addon = idx > 0
            tip = float(ord_item.get("tip_amount") or ord_item.get("tip") or 0.0)
            total_tips += tip

            item_copy = dict(ord_item)
            item_copy["batch_id"] = batch_id
            item_copy["is_batch_addon"] = is_addon
            item_copy["batch_window_id"] = batch_window_id
            item_copy["scheduled_wave"] = scheduled_wave
            item_copy["courier_earning"] = RIDER_BATCH_ADDON_PAYOUT if is_addon else RIDER_BASE_PAYOUT
            enriched_orders.append(item_copy)

        total_wages = calculate_batch_rider_earnings(len(enriched_orders), total_tips=total_tips)

        # Coordinate resolution: mean lat/lng or campus benchmark lookup
        coords = CAMPUS_HOSTEL_COORDINATES.get(hostel_block, (18.4485, 73.8267))
        valid_lats = [float(o["latitude"]) for o in enriched_orders if o.get("latitude") is not None]
        valid_lngs = [float(o["longitude"]) for o in enriched_orders if o.get("longitude") is not None]

        center_lat = sum(valid_lats) / len(valid_lats) if valid_lats else coords[0]
        center_lng = sum(valid_lngs) / len(valid_lngs) if valid_lngs else coords[1]

        batches.append({
            "batch_id": batch_id,
            "hostel_block": hostel_block,
            "canteen_key": canteen_key,
            "batch_window_id": batch_window_id,
            "scheduled_wave": scheduled_wave,
            "total_orders": len(enriched_orders),
            "orders": enriched_orders,
            "total_wages": total_wages,
            "total_tips": total_tips,
            "center_latitude": center_lat,
            "center_longitude": center_lng,
            "maps_navigation_url": f"https://www.google.com/maps/dir/?api=1&destination={center_lat},{center_lng}",
        })

    return batches


async def assign_batch_for_order(order_data: dict[str, Any]) -> dict[str, Any]:
    """Assigns an incoming order to an existing or new hostel batch."""
    return await find_or_create_batch_for_order(order_data)


async def get_active_batch_clusters() -> list[dict[str, Any]]:
    """
    Fetches all open orders from MongoDB and groups them into active batches.
    """
    active_statuses = [
        "Pending", "Accepted", "Preparing", "Ready for Pickup", "Assigned", "Out for Delivery",
        "pending", "accepted", "preparing", "ready for pickup", "assigned", "out for delivery",
    ]

    cursor = database["orders"].find({
        "status": {"$in": active_statuses},
        "$or": [
            {"delivery_type": {"$in": ["HOSTEL_BATCH", "BATCH", "DELIVERY", "CAMPUS_DELIVERY"]}},
            {"fulfillment_mode": "delivery"},
        ],
    })

    active_orders = await cursor.to_list(length=200)

    # Convert ObjectId to string
    for o in active_orders:
        if "_id" in o:
            o["id"] = str(o["_id"])
            o["_id"] = str(o["_id"])

    return cluster_orders_into_batches(active_orders)
