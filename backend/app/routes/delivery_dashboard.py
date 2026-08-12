from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, DELIVERY_PARTNER
from app.db.database import database

router = APIRouter(
    prefix="/delivery-dashboard",
    tags=["Delivery Dashboard"],
)

orders = database["orders"]

DELIVERY_EARNING_PER_ORDER = 50
ASSIGNED_STATUSES = ["Assigned"]
PICKED_UP_STATUSES = ["Picked Up", "Out for Delivery"]


def _start_of_today_utc() -> datetime:
    now = datetime.now(UTC)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _start_of_week_utc() -> datetime:
    today = _start_of_today_utc()
    return today - timedelta(days=today.weekday())


def _start_of_month_utc() -> datetime:
    today = _start_of_today_utc()
    return today.replace(day=1)


def _as_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    return None


def _serialize_order(order: dict) -> dict:
    item = dict(order)
    item["_id"] = str(item["_id"])
    return item


@router.get("/stats/{phone}")
async def delivery_stats(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Delivery partner phone is required",
        )

    assert_same_identity(current_user, phone=phone)

    # ==========================================
    # Partner's orders
    # ==========================================

    partner_orders = orders.find(
        {"delivery_partner.phone": phone}
    ).sort("delivery_partner.accepted_at", -1)

    pending = 0
    completed = 0
    earnings = 0

    assigned_orders = 0
    picked_up_orders = 0
    delivered_today = 0
    earnings_today = 0
    total_deliveries = 0
    deliveries_this_week = 0
    deliveries_this_month = 0
    recent_assigned_orders: list[dict] = []

    today_start = _start_of_today_utc()
    week_start = _start_of_week_utc()
    month_start = _start_of_month_utc()

    async for order in partner_orders:

        status = order.get("status")

        # Orders still being handled (legacy)
        if status in [
            "Assigned",
            "Accepted",
            "Picked Up",
            "Out for Delivery",
        ]:
            pending += 1

        # Completed deliveries (legacy)
        if status == "Delivered":
            completed += 1
            total_deliveries += 1

            # Current CampusBite delivery earning
            earnings += DELIVERY_EARNING_PER_ORDER

            delivered_at = _as_utc(order.get("delivered_at")) or _as_utc(
                order.get("created_at")
            )
            if delivered_at:
                if delivered_at >= today_start:
                    delivered_today += 1
                    earnings_today += DELIVERY_EARNING_PER_ORDER
                if delivered_at >= week_start:
                    deliveries_this_week += 1
                if delivered_at >= month_start:
                    deliveries_this_month += 1

        if status in ASSIGNED_STATUSES:
            assigned_orders += 1
            if len(recent_assigned_orders) < 5:
                recent_assigned_orders.append(_serialize_order(order))

        if status in PICKED_UP_STATUSES:
            picked_up_orders += 1

    return {
        # Legacy fields (unchanged)
        "phone": phone,
        "pending": pending,
        "completed": completed,
        "earnings": earnings,
        "rating": 4.9,
        # Extended read-only dashboard fields
        "assigned_orders": assigned_orders,
        "picked_up_orders": picked_up_orders,
        "delivered_today": delivered_today,
        "earnings_today": earnings_today,
        "total_deliveries": total_deliveries,
        "deliveries_this_week": deliveries_this_week,
        "deliveries_this_month": deliveries_this_month,
        "recent_assigned_orders": recent_assigned_orders,
    }
