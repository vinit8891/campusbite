"""Generate normal orders from active mess subscriptions for a given date."""

from __future__ import annotations

import random
from datetime import UTC, date, datetime

from app.models.order import create_order, subscription_order_exists
from app.models.restaurant import get_restaurant_by_email
from app.models.subscription import get_active_subscriptions
from app.models.user import get_user_by_email
from app.payments.amounts import to_paise
from app.services.subscription_calendar import (
    count_subscription_meals,
    is_subscription_scheduled_for_date,
)


def _meal_item_name(subscription: dict) -> str:
    meal_type = subscription.get("meal_type") or "meal"
    plan_name = subscription.get("plan_name")
    if plan_name:
        return f"{plan_name} ({meal_type})"
    return f"Mess {meal_type}"


def _per_meal_total(subscription: dict) -> float:
    price = float(subscription.get("price") or 0)
    meal_count = count_subscription_meals(subscription)
    return round(price / meal_count, 2)


def _order_payment_status(subscription: dict) -> str:
    if str(subscription.get("payment_status", "")).strip().lower() == "paid":
        return "paid"
    return "pending"


async def _build_order_payload(
    subscription: dict,
    target_date: date,
) -> dict | None:
    customer_email = subscription.get("customer_email")
    restaurant_email = subscription.get("restaurant_email")
    if not customer_email or not restaurant_email:
        return None

    user = await get_user_by_email(customer_email.lower())
    restaurant = await get_restaurant_by_email(restaurant_email)
    if not restaurant:
        return None

    meal_total = _per_meal_total(subscription)
    if meal_total <= 0:
        return None

    item_name = _meal_item_name(subscription)
    customer_id = str(user["_id"]) if user and user.get("_id") else None
    customer_name = (
        (user or {}).get("full_name")
        or (user or {}).get("name")
        or customer_email.split("@")[0]
    )
    phone = (user or {}).get("phone") or ""
    address = (
        (user or {}).get("address")
        or restaurant.get("address")
        or "Mess subscription delivery"
    )

    return {
        "restaurant_email": restaurant_email.lower(),
        "customer_id": customer_id,
        "customer_email": customer_email.lower(),
        "customer_name": customer_name,
        "phone": phone,
        "address": address,
        "payment_method": "cod",
        "payment_status": _order_payment_status(subscription),
        "total": meal_total,
        "amount_paise": to_paise(meal_total),
        "delivery_for": "self",
        "latitude": (user or {}).get("latitude"),
        "longitude": (user or {}).get("longitude"),
        "restaurant_latitude": restaurant.get("latitude", 18.52043),
        "restaurant_longitude": restaurant.get("longitude", 73.856743),
        "status": "Accepted",
        "delivery_otp": random.randint(1000, 9999),
        "otp_verified": False,
        "review_submitted": False,
        "items": [
            {
                "id": f"sub-{subscription['subscription_id']}",
                "name": item_name,
                "price": meal_total,
                "quantity": 1,
            }
        ],
        "subscription_id": subscription["subscription_id"],
        "subscription_order_date": target_date.isoformat(),
        "generated_by": "subscription",
        "created_at": datetime.now(UTC),
    }


async def generate_subscription_orders(target_date: date) -> dict:
    """
    Create one normal order per eligible active subscription for target_date.
    Idempotent per (subscription_id, target_date).
    """
    generated_count = 0
    skipped_count = 0
    order_ids: list[str] = []
    iso_date = target_date.isoformat()
    subscriptions = await get_active_subscriptions()

    for subscription in subscriptions:
        if not is_subscription_scheduled_for_date(subscription, target_date):
            skipped_count += 1
            continue

        subscription_id = subscription["subscription_id"]
        if await subscription_order_exists(subscription_id, iso_date):
            skipped_count += 1
            continue

        payload = await _build_order_payload(subscription, target_date)
        if not payload:
            skipped_count += 1
            continue

        order_id = await create_order(payload)
        generated_count += 1
        order_ids.append(order_id)

    return {
        "generated_count": generated_count,
        "skipped_count": skipped_count,
        "order_ids": order_ids,
    }
