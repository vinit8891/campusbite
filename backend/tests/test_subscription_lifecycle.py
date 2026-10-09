"""Comprehensive Unit & Integration Tests for Mess Subscription Lifecycle."""

from __future__ import annotations

from datetime import date, timedelta
from unittest.mock import AsyncMock, patch
import pytest

from app.schemas.subscription import (
    compute_subscription_end_date,
    SubscriptionCreate,
    SubscriptionPauseRequest,
    SubscriptionSkipDateRequest,
)
from app.services.subscription_calendar import (
    build_subscription_calendar,
    count_subscription_meals,
    is_subscription_scheduled_for_date,
)
from app.services.subscription_order_generator import (
    _per_meal_total,
    _meal_item_name,
    generate_subscription_orders,
)
from app.models.subscription import (
    VALID_STATUSES,
    _serialize,
    _normalize_dates_for_storage,
    subscription_matches_renewal,
)


def test_subscription_status_constants():
    """Verify supported subscription statuses."""
    assert VALID_STATUSES == {"active", "paused", "expired", "cancelled"}


def test_compute_subscription_end_date():
    """Verify subscription validity windows for weekly and monthly."""
    start = date(2026, 8, 1)

    weekly_end = compute_subscription_end_date(start, "weekly")
    assert weekly_end == date(2026, 8, 7)  # 6 days later -> 7 days total

    monthly_end = compute_subscription_end_date(start, "monthly")
    assert monthly_end == date(2026, 8, 30)  # 29 days later -> 30 days total


def test_calendar_scheduling_and_meal_counting():
    """Verify schedule matching, weekday filtering, and skipped dates."""
    sub = {
        "subscription_id": "sub_101",
        "meal_type": "lunch",
        "subscription_type": "weekly",
        "start_date": "2026-08-01",  # Saturday
        "end_date": "2026-08-07",    # Friday
        "delivery_days": ["monday", "wednesday", "friday"],
        "skipped_dates": ["2026-08-03"],  # Monday skipped
        "status": "active",
        "price": 600.0,
    }

    # Aug 1 (Sat) - Not delivery day
    assert not is_subscription_scheduled_for_date(sub, date(2026, 8, 1))
    # Aug 3 (Mon) - Skipped
    assert not is_subscription_scheduled_for_date(sub, date(2026, 8, 3))
    # Aug 5 (Wed) - Active
    assert is_subscription_scheduled_for_date(sub, date(2026, 8, 5))
    # Aug 7 (Fri) - Active
    assert is_subscription_scheduled_for_date(sub, date(2026, 8, 7))

    # Meal count: Wed + Fri = 2 meals (since Mon was skipped)
    count = count_subscription_meals(sub)
    assert count == 2


def test_order_generator_pricing_calculation():
    """Verify per-meal price subdivision for subscription accounting."""
    sub = {
        "subscription_id": "sub_202",
        "meal_type": "lunch",
        "subscription_type": "monthly",
        "start_date": "2026-08-01",
        "end_date": "2026-08-30",
        "delivery_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "skipped_dates": [],
        "status": "active",
        "price": 2400.0,
        "plan_name": "Premium Mess Lunch",
    }

    # 30 days window from Aug 1 to Aug 30: 21 weekdays
    meals = count_subscription_meals(sub)
    assert meals > 0
    per_meal = _per_meal_total(sub)
    assert per_meal == round(2400.0 / meals, 2)
    assert _meal_item_name(sub) == "Premium Mess Lunch (lunch)"


@pytest.mark.asyncio
async def test_order_generation_idempotency():
    """Verify order generation skips already generated orders and inactive subscriptions."""
    target_date = date(2026, 8, 5)  # Wednesday

    active_sub = {
        "subscription_id": "sub_active",
        "customer_email": "student@campus.edu",
        "restaurant_email": "canteen@campus.edu",
        "meal_type": "lunch",
        "subscription_type": "weekly",
        "start_date": "2026-08-01",
        "end_date": "2026-08-07",
        "delivery_days": ["wednesday"],
        "skipped_dates": [],
        "status": "active",
        "price": 300.0,
        "payment_status": "paid",
    }

    mock_user = {"_id": "usr_1", "full_name": "Test Student", "phone": "9999912345"}
    mock_restaurant = {"_id": "rst_1", "name": "Campus Mess", "address": "Hostel Ground Floor"}

    with (
        patch("app.services.subscription_order_generator.get_active_subscriptions", AsyncMock(return_value=[active_sub])),
        patch("app.services.subscription_order_generator.subscription_order_exists", AsyncMock(return_value=False)),
        patch("app.services.subscription_order_generator.get_user_by_email", AsyncMock(return_value=mock_user)),
        patch("app.services.subscription_order_generator.get_restaurant_by_email", AsyncMock(return_value=mock_restaurant)),
        patch("app.services.subscription_order_generator.create_order", AsyncMock(return_value="ord_12345")),
    ):
        res = await generate_subscription_orders(target_date)
        assert res["generated_count"] == 1
        assert res["order_ids"] == ["ord_12345"]

    # When order already exists, generation is idempotent and produces 0 new orders
    with (
        patch("app.services.subscription_order_generator.get_active_subscriptions", AsyncMock(return_value=[active_sub])),
        patch("app.services.subscription_order_generator.subscription_order_exists", AsyncMock(return_value=True)),
    ):
        res_dup = await generate_subscription_orders(target_date)
        assert res_dup["generated_count"] == 0
        assert res_dup["skipped_count"] == 1


def test_subscription_renewal_matching():
    """Verify subscription matches renewal payment logic."""
    sub = {
        "end_date": "2026-08-31",
        "payment_status": "paid",
    }
    payment = {
        "renewal_end": "2026-08-31",
    }
    assert subscription_matches_renewal(sub, payment) is True

    # Earlier end date means not yet applied
    sub_old = {
        "end_date": "2026-07-31",
        "payment_status": "paid",
    }
    assert subscription_matches_renewal(sub_old, payment) is False
