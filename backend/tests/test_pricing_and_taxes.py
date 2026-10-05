import pytest
from fastapi import HTTPException
from app.payments.amounts import (
    calculate_order_amounts,
    calculate_payable_amount,
    calculate_cod_rounding,
    get_calibrated_app_price,
    assert_client_total_matches,
    RIDER_COD_BALANCE_CEILING,
    FOOD_GST_RATE,
    COMMISSION_RATE,
    BATCH_DELIVERY_FEE,
    EXPRESS_DELIVERY_FEE,
    MIN_DELIVERY_SUBTOTAL,
    SMALL_ORDER_THRESHOLD,
    SMALL_ORDER_FEE,
)


def test_poha_batch_drop_cod():
    """
    Poha test (Counter ₹35):
    - Calibrated price = ceil(35 / 0.82) = 43
    - Subtotal ₹43 is >= ₹35 and < ₹50 -> Small order fee ₹5.00 applies
    - Hostel batch delivery = ₹15
    - Platform tech fee = ₹5
    - Food GST 5% = 2.15
    - Small order fee = ₹5.00
    - Unrounded total = 43 + 2.15 + 5 + 15 + 5 = 70.15
    - COD rounded total = ₹70 (roundOff: -0.15)
    """
    items = [
        {"id": "p1", "name": "Poha", "price": 35.0, "quantity": 1}
    ]

    breakdown = calculate_order_amounts(
        items=items,
        delivery_type="HOSTEL_BATCH",
        tip_amount=0.0,
        payment_method="COD",
    )

    assert breakdown["app_subtotal"] == 43.0
    assert breakdown["canteen_counter_base"] == 35.0
    assert breakdown["gst_amount"] == 2.15
    assert breakdown["platform_fee"] == 5.00
    assert breakdown["delivery_fee"] == 15.00
    assert breakdown["small_order_fee"] == 5.00
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["total_unrounded"] == 70.15
    assert breakdown["total_payable"] == 70.0  # COD rounded to whole rupee
    assert breakdown["cod_rounding"]["round_off"] == -0.15
    assert breakdown["canteen_payout"]["base_food"] == 35.0
    assert breakdown["canteen_payout"]["total_disbursal"] == 37.15


def test_chapati_bhaji_batch_drop_cod():
    """
    Chapati Bhaji test (Counter ₹60):
    - Calibrated price = ceil(60 / 0.82) = 74
    - Subtotal ₹74 >= ₹50 -> Small order fee = ₹0.00
    - Hostel batch delivery = ₹15
    - Tech fee = ₹5
    - GST 5% = 3.70
    - Unrounded = 74 + 3.70 + 5 + 15 + 0 = 97.70
    - COD rounded = ₹98 (roundOff: +0.30)
    """
    items = [
        {"id": "cb1", "name": "Chapati Bhaji", "price": 60.0, "quantity": 1}
    ]

    breakdown = calculate_order_amounts(
        items=items,
        delivery_type="HOSTEL_BATCH",
        tip_amount=0.0,
        payment_method="COD",
    )

    assert breakdown["app_subtotal"] == 74.0
    assert breakdown["canteen_counter_base"] == 60.0
    assert breakdown["gst_amount"] == 3.70
    assert breakdown["platform_fee"] == 5.00
    assert breakdown["delivery_fee"] == 15.00
    assert breakdown["small_order_fee"] == 0.00
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["total_unrounded"] == 97.70
    assert breakdown["total_payable"] == 98.0
    assert breakdown["cod_rounding"]["round_off"] == 0.30


def test_rice_plate_express_online_with_tip():
    """
    Rice Plate test (Counter ₹80):
    - Calibrated price = ceil(80 / 0.82) = 98
    - Express delivery = ₹40
    - Tech fee = ₹5
    - Tip = ₹20
    - GST 5% = 4.90
    - Small order fee = 0.00
    - Online total = 98 + 4.90 + 5 + 40 + 0 + 20 = 167.90
    """
    items = [
        {"id": "rp1", "name": "Rice Plate", "price": 80.0, "quantity": 1}
    ]

    breakdown = calculate_order_amounts(
        items=items,
        delivery_type="EXPRESS_DOOR",
        tip_amount=20.0,
        payment_method="ONLINE",
    )

    assert breakdown["app_subtotal"] == 98.0
    assert breakdown["canteen_counter_base"] == 80.0
    assert breakdown["gst_amount"] == 4.90
    assert breakdown["platform_fee"] == 5.00
    assert breakdown["delivery_fee"] == 40.00
    assert breakdown["small_order_fee"] == 0.00
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["tip_amount"] == 20.00
    assert breakdown["total_payable"] == 167.90
    assert breakdown["cod_rounding"] is None


def test_counter_takeaway_mode():
    """
    Counter Takeaway test:
    - ₹0 delivery fee
    - ₹3 platform pass
    - ₹0 small order fee regardless of subtotal
    """
    items = [
        {"id": "p1", "name": "Poha", "price": 35.0, "quantity": 1}
    ]

    breakdown = calculate_order_amounts(
        items=items,
        delivery_type="COUNTER_TAKEAWAY",
        tip_amount=0.0,
        payment_method="ONLINE",
    )

    assert breakdown["delivery_fee"] == 0.0
    assert breakdown["platform_fee"] == 3.0
    assert breakdown["small_order_fee"] == 0.0
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["total_payable"] == 48.15  # 43 + 2.15 + 3


def test_min_delivery_subtotal_and_small_order_fee():
    assert MIN_DELIVERY_SUBTOTAL == 35.0
    assert SMALL_ORDER_THRESHOLD == 50.0
    assert SMALL_ORDER_FEE == 5.0

    # 1. Below ₹35 delivery subtotal: item counter price 20 -> app price ceil(20/0.82) = 25
    items_low = [{"id": "tea1", "name": "Tea", "price": 20.0, "quantity": 1}]
    del_breakdown = calculate_order_amounts(items=items_low, delivery_type="HOSTEL_BATCH")
    assert del_breakdown["app_subtotal"] == 25.0
    assert del_breakdown["is_below_min_delivery"] is True
    assert "Minimum cart for hostel delivery is ₹35.00" in del_breakdown["min_delivery_error"]
    assert del_breakdown["small_order_fee"] == 0.0

    # 2. Below ₹35 takeaway subtotal: permitted without fee or error
    takeaway_breakdown = calculate_order_amounts(items=items_low, delivery_type="COUNTER_TAKEAWAY")
    assert takeaway_breakdown["app_subtotal"] == 25.0
    assert takeaway_breakdown["is_below_min_delivery"] is False
    assert takeaway_breakdown["small_order_fee"] == 0.0

    # 3. ₹35 - ₹49.99 delivery subtotal: item counter price 30 -> app price ceil(30/0.82) = 37
    items_mid = [{"id": "s1", "name": "Samosa", "price": 30.0, "quantity": 1}]
    mid_breakdown = calculate_order_amounts(items=items_mid, delivery_type="HOSTEL_BATCH")
    assert mid_breakdown["app_subtotal"] == 37.0
    assert mid_breakdown["is_below_min_delivery"] is False
    assert mid_breakdown["small_order_fee"] == 5.00

    # 4. Reaching ₹50.00 delivery subtotal: item counter price 41 -> app price ceil(41/0.82) = 50
    items_high = [{"id": "b1", "name": "Burger", "price": 41.0, "quantity": 1}]
    high_breakdown = calculate_order_amounts(items=items_high, delivery_type="HOSTEL_BATCH")
    assert high_breakdown["app_subtotal"] == 50.0
    assert high_breakdown["is_below_min_delivery"] is False
    assert high_breakdown["small_order_fee"] == 0.00


def test_canonical_18_percent_commission():
    assert COMMISSION_RATE == 0.18
    from app.payments.amounts import RESTAURANT_COMMISSION_RATE
    assert RESTAURANT_COMMISSION_RATE == 0.18

    gross_food = 100.00
    food_gst = round(FOOD_GST_RATE * gross_food, 2)
    commission = round(RESTAURANT_COMMISSION_RATE * gross_food, 2)
    net_disbursal = round(gross_food + food_gst - commission, 2)

    assert food_gst == 5.00
    assert commission == 18.00
    assert net_disbursal == 87.00


def test_assert_client_total_matches():
    assert_client_total_matches(70.00, 70.02, tolerance=0.05)

    with pytest.raises(HTTPException) as exc_info:
        assert_client_total_matches(50.00, 70.00, tolerance=0.05)
    assert exc_info.value.status_code == 400


def test_rider_cod_balance_ceiling_value():
    assert RIDER_COD_BALANCE_CEILING == 1000.0

