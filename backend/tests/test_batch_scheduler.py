"""Unit tests for Hostel Batch Window Scheduler and Wave Dispatch Engine."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, patch
import pytest

from app.services.batch_scheduler import (
    CAMPUS_WAVE_SLOTS,
    get_next_batch_window,
    find_or_create_batch_for_order,
    IST_OFFSET,
)
from app.payments.amounts import (
    RIDER_BASE_PAYOUT,
    RIDER_BATCH_ADDON_PAYOUT,
)


def test_campus_wave_slot_definitions():
    """Verify all 6 canonical delivery wave slots in IST."""
    assert len(CAMPUS_WAVE_SLOTS) == 6
    slot_ids = [slot["slot_id"] for slot in CAMPUS_WAVE_SLOTS]
    assert slot_ids == [
        "LUNCH_WAVE_1",
        "LUNCH_WAVE_2",
        "SNACKS_WAVE_1",
        "DINNER_WAVE_1",
        "DINNER_WAVE_2",
        "DINNER_WAVE_3",
    ]

    # Verify 15-minute preparation cutoff rule
    for slot in CAMPUS_WAVE_SLOTS:
        start_mins = slot["start_hour"] * 60 + slot["start_minute"]
        cutoff_mins = slot["cutoff_hour"] * 60 + slot["cutoff_minute"]
        assert start_mins - cutoff_mins == 15


def test_get_next_batch_window_selection():
    """Verify correct wave slot resolution across different IST times."""
    # 1. 12:10 PM IST -> Lunch Wave 1 (cutoff at 12:30 PM, 20 mins remaining)
    t1 = datetime(2026, 10, 6, 12, 10, tzinfo=IST_OFFSET)
    w1 = get_next_batch_window(t1)
    assert w1["slot_id"] == "LUNCH_WAVE_1"
    assert w1["delivery_window"] == "12:45 PM – 1:15 PM"
    assert w1["minutes_remaining"] == 20

    # 2. 12:35 PM IST -> Lunch Wave 2 (cutoff at 1:00 PM, 25 mins remaining)
    t2 = datetime(2026, 10, 6, 12, 35, tzinfo=IST_OFFSET)
    w2 = get_next_batch_window(t2)
    assert w2["slot_id"] == "LUNCH_WAVE_2"
    assert w2["delivery_window"] == "1:15 PM – 1:45 PM"
    assert w2["minutes_remaining"] == 25

    # 3. 4:45 PM IST -> Snacks Wave (cutoff at 5:00 PM, 15 mins remaining)
    t3 = datetime(2026, 10, 6, 16, 45, tzinfo=IST_OFFSET)
    w3 = get_next_batch_window(t3)
    assert w3["slot_id"] == "SNACKS_WAVE_1"
    assert w3["delivery_window"] == "5:15 PM – 5:45 PM"
    assert w3["minutes_remaining"] == 15

    # 4. 7:30 PM IST -> Dinner Wave 1 (cutoff at 7:45 PM, 15 mins remaining)
    t4 = datetime(2026, 10, 6, 19, 30, tzinfo=IST_OFFSET)
    w4 = get_next_batch_window(t4)
    assert w4["slot_id"] == "DINNER_WAVE_1"
    assert w4["delivery_window"] == "8:00 PM – 8:30 PM"
    assert w4["minutes_remaining"] == 15

    # 5. 8:15 PM IST -> Dinner Wave 2 (cutoff at 8:30 PM, 15 mins remaining)
    t5 = datetime(2026, 10, 6, 20, 15, tzinfo=IST_OFFSET)
    w5 = get_next_batch_window(t5)
    assert w5["slot_id"] == "DINNER_WAVE_2"
    assert w5["delivery_window"] == "8:45 PM – 9:15 PM"
    assert w5["minutes_remaining"] == 15

    # 6. 8:50 PM IST -> Dinner Wave 3 (cutoff at 9:15 PM, 25 mins remaining)
    t6 = datetime(2026, 10, 6, 20, 50, tzinfo=IST_OFFSET)
    w6 = get_next_batch_window(t6)
    assert w6["slot_id"] == "DINNER_WAVE_3"
    assert w6["delivery_window"] == "9:30 PM – 10:00 PM"
    assert w6["minutes_remaining"] == 25

    # 7. 10:45 PM IST (Late Night) -> Tomorrow's Lunch Wave 1
    t7 = datetime(2026, 10, 6, 22, 45, tzinfo=IST_OFFSET)
    w7 = get_next_batch_window(t7)
    assert w7["slot_id"] == "LUNCH_WAVE_1"
    assert "Tomorrow" in w7["label"]
    assert "Tomorrow" in w7["delivery_window"]


@pytest.mark.asyncio
async def test_consecutive_orders_same_hostel_and_wave_share_batch_and_addon_wage():
    """
    Verify two consecutive orders to Test Hostel Block A in the same wave:
    - Order 1: gets a new batch_id, is_batch_addon = False, credited RIDER_BASE_PAYOUT (₹20.0).
    - Order 2: joins the existing batch_id, is_batch_addon = True, credited RIDER_BATCH_ADDON_PAYOUT (₹10.0).
    """
    canteen_email = "testcanteen@campusbite.com"
    hostel_block = "Test Hostel Block A"
    batch_window_id = "LUNCH_WAVE_1"

    order_1_data = {
        "delivery_type": "HOSTEL_BATCH",
        "restaurant_email": canteen_email,
        "hostel_block": hostel_block,
        "batch_window_id": batch_window_id,
        "tip_amount": 0.0,
    }

    # Order 1: DB has no open batch yet
    mock_db = {"orders": AsyncMock()}
    mock_db["orders"].find_one = AsyncMock(return_value=None)

    with patch("app.services.batch_scheduler.database", mock_db):
        batch_info_1 = await find_or_create_batch_for_order(order_1_data)
        assert batch_info_1["is_batch_addon"] is False
        assert batch_info_1["calculated_payout"] == RIDER_BASE_PAYOUT  # ₹20.00
        batch_id_1 = batch_info_1["batch_id"]
        assert batch_id_1 is not None
        assert "TestHostelBlockA" in batch_id_1

    # Order 2: DB now finds the open batch from Order 1
    existing_order_doc = {
        "order_id": "ORDER_1",
        "delivery_type": "HOSTEL_BATCH",
        "restaurant_email": canteen_email,
        "hostel_block": hostel_block,
        "batch_window_id": batch_window_id,
        "batch_id": batch_id_1,
        "is_batch_addon": False,
        "status": "Ready for Pickup",
        "total": 65.0,
    }

    mock_db["orders"].find_one = AsyncMock(return_value=existing_order_doc)

    order_2_data = {
        "delivery_type": "HOSTEL_BATCH",
        "restaurant_email": canteen_email,
        "hostel_block": hostel_block,
        "batch_window_id": batch_window_id,
        "tip_amount": 5.0,  # ₹5.00 tip
    }

    with patch("app.services.batch_scheduler.database", mock_db):
        batch_info_2 = await find_or_create_batch_for_order(order_2_data)
        assert batch_info_2["is_batch_addon"] is True
        assert batch_info_2["batch_id"] == batch_id_1
        # ₹10.00 add-on payout + ₹5.00 tip = ₹15.00
        assert batch_info_2["calculated_payout"] == RIDER_BATCH_ADDON_PAYOUT + 5.0


@pytest.mark.asyncio
async def test_order_to_different_hostel_block_creates_new_batch():
    """
    Verify an order to Test Hostel Block B creates a distinct batch_id with is_batch_addon = False.
    """
    canteen_email = "testcanteen@campusbite.com"
    batch_window_id = "DINNER_WAVE_1"

    mock_db = {"orders": AsyncMock()}
    mock_db["orders"].find_one = AsyncMock(return_value=None)

    order_b_data = {
        "delivery_type": "HOSTEL_BATCH",
        "restaurant_email": canteen_email,
        "hostel_block": "Test Hostel Block B",
        "batch_window_id": batch_window_id,
        "tip_amount": 0.0,
    }

    with patch("app.services.batch_scheduler.database", mock_db):
        batch_info_b = await find_or_create_batch_for_order(order_b_data)
        assert batch_info_b["is_batch_addon"] is False
        assert batch_info_b["batch_id"] is not None
        assert "TestHostelBlockB" in batch_info_b["batch_id"]
        assert batch_info_b["calculated_payout"] == RIDER_BASE_PAYOUT  # ₹20.00


@pytest.mark.asyncio
async def test_non_batch_orders_not_batched():
    """
    Verify COUNTER_TAKEAWAY or EXPRESS_DOOR orders bypass batching.
    """
    order_data = {
        "delivery_type": "COUNTER_TAKEAWAY",
        "restaurant_email": "canteen@campusbite.com",
        "hostel_block": "Block A",
        "tip_amount": 0.0,
    }

    batch_info = await find_or_create_batch_for_order(order_data)
    assert batch_info["is_batch_addon"] is False
    assert batch_info["batch_id"] is None
    assert batch_info["calculated_payout"] == 0.0
