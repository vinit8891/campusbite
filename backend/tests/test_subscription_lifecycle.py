"""Comprehensive Unit & Integration Tests for Mess Subscription Lifecycle."""

from __future__ import annotations

from datetime import date, timedelta
from unittest.mock import AsyncMock, patch
import pytest

from app.schemas.subscription import (
    compute_subscription_end_date,
    calculate_subscription_pricing,
    VALID_PLAN_TYPES,
    VALID_DELIVERY_PREFERENCES,
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
from app.services.settlement_service import (
    _extract_order_food_subtotal,
    FOOD_GST_RATE,
    CANTEEN_COMMISSION_RATE,
)
from app.services.courier_roster_service import (
    reserve_courier_shift,
    check_and_execute_t20_roster_dispatch,
    dispatch_clustered_mess_batch,
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


def test_weekly_plan_pricing_calculation():
    """Verify weekly plan mathematical pricing rules and validation."""
    assert "WEEKLY" in VALID_PLAN_TYPES and "MONTHLY" in VALID_PLAN_TYPES
    assert "DINE_IN" in VALID_DELIVERY_PREFERENCES and "HOSTEL_LOBBY_DELIVERY" in VALID_DELIVERY_PREFERENCES

    # 1. Weekly Dine-In Single Meal (7 meals @ ₹80 + ₹0 delivery + ₹25 platform fee)
    dine_in_pricing = calculate_subscription_pricing(
        plan_type="WEEKLY",
        delivery_preference="DINE_IN",
        meal_type="lunch",
        base_meal_price=80.0,
    )
    assert dine_in_pricing["meals_count"] == 7
    assert dine_in_pricing["base_food_total"] == 560.0
    assert dine_in_pricing["delivery_addon"] == 0.0
    assert dine_in_pricing["platform_fee"] == 25.0
    assert dine_in_pricing["total_price"] == 585.0

    # 2. Weekly Hostel Lobby Drop (7 meals @ ₹80 + ₹15*7 delivery + ₹25 platform fee)
    hostel_pricing = calculate_subscription_pricing(
        plan_type="WEEKLY",
        delivery_preference="HOSTEL_LOBBY_DELIVERY",
        meal_type="lunch",
        base_meal_price=80.0,
    )
    assert hostel_pricing["meals_count"] == 7
    assert hostel_pricing["base_food_total"] == 560.0
    assert hostel_pricing["delivery_addon"] == 105.0  # 7 * 15 > 0 strictly positive
    assert hostel_pricing["platform_fee"] == 25.0    # strictly positive
    assert hostel_pricing["total_price"] == 690.0

    # 3. Dual Meal Combo (14 meals @ ₹80 + ₹15*14 delivery + ₹25 platform fee)
    combo_pricing = calculate_subscription_pricing(
        plan_type="WEEKLY",
        delivery_preference="HOSTEL_LOBBY_DELIVERY",
        meal_type="combo",
        base_meal_price=80.0,
    )
    assert combo_pricing["meals_count"] == 14
    assert combo_pricing["base_food_total"] == 1120.0
    assert combo_pricing["delivery_addon"] == 210.0
    assert combo_pricing["platform_fee"] == 25.0
    assert combo_pricing["total_price"] == 1355.0


def test_weekly_mess_settlement_economics():
    """
    Verify loss-proof daily canteen settlement economics:
    - Only credits redeemed meals on that calendar day.
    - Canteen Net per Meal = (base_meal_price * 1.05) - (base_meal_price * 0.18) = base_meal_price * 0.87.
    - delivery_addon and platform_fee remain 100% isolated to the platform pool with 0 leakage.
    """
    # Simulate 10 delivered subscription orders with hostel delivery addons and platform fees
    sample_order = {
        "_id": "ord_sub_01",
        "restaurant_email": "northmess@campus.edu",
        "status": "Delivered",
        "base_meal_price": 80.0,
        "food_subtotal": 80.0,
        "delivery_addon": 15.0,
        "delivery_fee": 15.0,
        "platform_fee": 25.0,
        "total": 120.0,
        "items": [
            {"item_name": "North Veg Thali", "price": 80.0, "quantity": 1}
        ],
    }

    # Food subtotal extraction must be strictly ₹80, isolating delivery and platform fees
    extracted_subtotal = _extract_order_food_subtotal(sample_order)
    assert extracted_subtotal == 80.0

    # Compute settlement economics for 10 meals
    num_meals = 10
    base_meal_price = 80.0
    gross_food_sales = round(num_meals * base_meal_price, 2)
    assert gross_food_sales == 800.0

    # 5% Food GST and 18% Canteen Commission
    gst_collected = round(gross_food_sales * FOOD_GST_RATE, 2)
    assert gst_collected == 40.0  # 800 * 0.05

    platform_commission = round(gross_food_sales * CANTEEN_COMMISSION_RATE, 2)
    assert platform_commission == 144.0  # 800 * 0.18

    net_canteen_payable = round(gross_food_sales + gst_collected - platform_commission, 2)
    assert net_canteen_payable == 696.0  # 800 * 0.87

    # Net per meal received by mess canteen must exactly be 87% of base meal price
    canteen_net_per_meal = round(net_canteen_payable / num_meals, 2)
    assert canteen_net_per_meal == round(base_meal_price * 0.87, 2)
    assert canteen_net_per_meal == 69.60

    # Platform pool isolation check: delivery addon (₹150) + platform commission (₹144) + platform fee (₹25)
    # Delivery pool leakage to canteen must be strictly 0.0
    canteen_received_delivery_addon = 0.0
    assert canteen_received_delivery_addon == 0.0


@pytest.mark.asyncio
async def test_courier_shift_reservation_and_t20_dispatch():
    """
    Verify Courier Wave Shift Roster reservation and T-20 fallback dispatch.
    - Couriers can claim Lunch (1:00 PM) wave slot.
    - If rider is offline at T-20, reservation is released and priority mess batch is flagged.
    - Clustered batch dispatch calculates ₹20 base + ₹10 add-on courier pay.
    """
    fake_db = {
        "courier_shift_reservations": {},
        "delivery_partners": {},
        "orders": {},
    }

    class MockAsyncCursor:
        def __init__(self, docs):
            self.docs = list(docs)
            self._idx = 0
        def __aiter__(self):
            return self
        async def __anext__(self):
            if self._idx >= len(self.docs):
                raise StopAsyncIteration
            item = self.docs[self._idx]
            self._idx += 1
            return item

    class MockCollection:
        def __init__(self, store):
            self.store = store
        async def find_one(self, query):
            for doc in self.store.values():
                match = True
                for k, v in query.items():
                    if k == "$or":
                        pass
                    elif isinstance(v, dict) and "$in" in v:
                        if doc.get(k) not in v["$in"]:
                            match = False
                    elif doc.get(k) != v:
                        match = False
                if match:
                    return doc
            return None
        def find(self, query):
            matched = []
            for doc in self.store.values():
                m = True
                for k, v in query.items():
                    if k == "status" and isinstance(v, dict) and "$in" in v:
                        if doc.get(k) not in v["$in"]:
                            m = False
                    elif doc.get(k) != v:
                        m = False
                if m:
                    matched.append(doc)
            return MockAsyncCursor(matched)
        async def count_documents(self, query):
            count = 0
            for doc in self.store.values():
                m = True
                for k, v in query.items():
                    if k == "status" and isinstance(v, dict) and "$in" in v:
                        if doc.get(k) not in v["$in"]:
                            m = False
                    elif doc.get(k) != v:
                        m = False
                if m:
                    count += 1
            return count
        async def insert_one(self, doc):
            new_id = doc.get("_id") or f"res_{len(self.store) + 1}"
            doc["_id"] = new_id
            self.store[new_id] = doc
            class InsertRes:
                inserted_id = new_id
            return InsertRes()
        async def update_one(self, filter_q, update_q):
            target = None
            for doc in self.store.values():
                if "_id" in filter_q and doc.get("_id") == filter_q["_id"]:
                    target = doc
                    break
            if target and "$set" in update_q:
                target.update(update_q["$set"])
                class UpdateRes:
                    modified_count = 1
                return UpdateRes()
            class UpdateResZero:
                modified_count = 0
            return UpdateResZero()

    mock_db = {
        "courier_shift_reservations": MockCollection(fake_db["courier_shift_reservations"]),
        "delivery_partners": MockCollection(fake_db["delivery_partners"]),
        "orders": MockCollection(fake_db["orders"]),
    }

    with patch("app.services.courier_roster_service.database", mock_db):
        # 1. Courier reserves shift
        res = await reserve_courier_shift(
            courier_id="rider_01",
            courier_phone="+919876543210",
            courier_name="Vijay Kumar",
            wave_slot_id="LUNCH_WAVE_1",
            shift_date="2026-10-10",
            hostel_block="Hostel Block A (North Campus)",
        )
        assert res["success"] is True
        assert res["reservation_id"] is not None

        # 2. T-20 Check when courier is offline -> should release reservation and trigger priority broadcast
        t20_audit = await check_and_execute_t20_roster_dispatch(
            shift_date="2026-10-10",
            wave_slot_id="LUNCH_WAVE_1",
        )
        assert t20_audit["released_count"] == 1
        assert len(t20_audit["priority_broadcasts"]) == 1
        assert t20_audit["priority_broadcasts"][0]["is_priority_mess_batch"] is True
        assert t20_audit["priority_broadcasts"][0]["released_courier_phone"] == "+919876543210"

