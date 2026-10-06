import pytest
from fastapi import HTTPException
from app.payments.amounts import (
    calculate_order_amounts,
    calculate_payable_amount,
    calculate_cod_rounding,
    get_calibrated_app_price,
    assert_client_total_matches,
    RIDER_BASE_PAYOUT,
    RIDER_BATCH_ADDON_PAYOUT,
    calculate_rider_payout,
    calculate_batch_rider_earnings,
    RIDER_COD_BALANCE_CEILING,
    MAX_UNREMITTED_CASH_LIMIT,
    FOOD_GST_RATE,
    COMMISSION_RATE,
    BATCH_DELIVERY_FEE,
    EXPRESS_DELIVERY_FEE,
    MIN_DELIVERY_SUBTOTAL,
    SMALL_CART_THRESHOLD,
    PLATFORM_FEE_STANDARD,
    PLATFORM_FEE_SMALL_CART,
)


def test_poha_batch_drop_cod():
    """
    Poha test (Counter ₹35):
    - Calibrated price = ceil(35 / 0.82) = 43
    - Subtotal ₹43 is < ₹50 -> Dynamic Platform Tech fee = ₹5.00
    - Hostel batch delivery = ₹15
    - Food GST 5% = 2.15
    - Small order fee = 0.00 (removed)
    - Unrounded total = 43 + 2.15 + 5 + 15 = 65.15
    - COD rounded total = ₹65 (roundOff: -0.15)
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
    assert breakdown["small_order_fee"] == 0.00
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["total_unrounded"] == 65.15
    assert breakdown["total_payable"] == 65.0  # COD rounded to whole rupee
    assert breakdown["cod_rounding"]["round_off"] == -0.15
    assert breakdown["canteen_payout"]["base_food"] == 35.0
    assert breakdown["canteen_payout"]["total_disbursal"] == 37.15


def test_chapati_bhaji_batch_drop_cod():
    """
    Chapati Bhaji test (Counter ₹60):
    - Calibrated price = ceil(60 / 0.82) = 74
    - Subtotal ₹74 >= ₹50 -> Dynamic Platform Tech fee = ₹3.00
    - Hostel batch delivery = ₹15
    - GST 5% = 3.70
    - Unrounded = 74 + 3.70 + 3 + 15 = 95.70
    - COD rounded = ₹96 (roundOff: +0.30)
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
    assert breakdown["platform_fee"] == 3.00
    assert breakdown["delivery_fee"] == 15.00
    assert breakdown["small_order_fee"] == 0.00
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["total_unrounded"] == 95.70
    assert breakdown["total_payable"] == 96.0
    assert breakdown["cod_rounding"]["round_off"] == 0.30


def test_rice_plate_express_online_with_tip():
    """
    Rice Plate test (Counter ₹80):
    - Calibrated price = ceil(80 / 0.82) = 98
    - Express delivery = ₹40
    - Tech fee = ₹3 (subtotal 98 >= 50)
    - Tip = ₹20
    - GST 5% = 4.90
    - Small order fee = 0.00
    - Online total = 98 + 4.90 + 3 + 40 + 20 = 165.90
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
    assert breakdown["platform_fee"] == 3.00
    assert breakdown["delivery_fee"] == 40.00
    assert breakdown["small_order_fee"] == 0.00
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["tip_amount"] == 20.00
    assert breakdown["total_payable"] == 165.90
    assert breakdown["cod_rounding"] is None


def test_veg_thali_calibrated_delivery_and_takeaway():
    """
    Veg Thali (Counter ₹80 -> Calibrated App Price ₹98):
    - Items Subtotal: ₹98.00
    - Food GST (5%): ₹4.90
    - Delivery Fee: ₹15.00
    - Platform Tech Fee: ₹3.00 (since 98 >= 50)
    - Grand Total: ₹120.90
    """
    items = [{"id": "vt1", "name": "Veg Thali", "price": 80.0, "quantity": 1}]

    # Delivery
    breakdown_del = calculate_order_amounts(
        items=items,
        delivery_type="HOSTEL_BATCH",
        payment_method="ONLINE",
    )
    assert breakdown_del["food_subtotal"] == 98.00
    assert breakdown_del["restaurant_gst"] == 4.90
    assert breakdown_del["delivery_fee"] == 15.00
    assert breakdown_del["platform_fee"] == 3.00
    assert breakdown_del["small_order_fee"] == 0.00
    assert breakdown_del["total_payable"] == 120.90

    # Takeaway
    breakdown_takeaway = calculate_order_amounts(
        items=items,
        delivery_type="COUNTER_TAKEAWAY",
        payment_method="ONLINE",
    )
    assert breakdown_takeaway["food_subtotal"] == 98.00
    assert breakdown_takeaway["restaurant_gst"] == 4.90
    assert breakdown_takeaway["delivery_fee"] == 0.00
    assert breakdown_takeaway["platform_fee"] == 3.00
    assert breakdown_takeaway["small_order_fee"] == 0.00
    assert breakdown_takeaway["total_payable"] == 105.90


def test_counter_takeaway_mode():
    """
    Counter Takeaway test for small cart:
    - ₹0 delivery fee
    - ₹5 platform tech fee (< 50)
    - ₹0 small order fee
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
    assert breakdown["platform_fee"] == 5.0
    assert breakdown["small_order_fee"] == 0.0
    assert breakdown["is_below_min_delivery"] is False
    assert breakdown["total_payable"] == 50.15  # 43 + 2.15 + 5


def test_min_delivery_subtotal_and_dynamic_tech_fee():
    assert MIN_DELIVERY_SUBTOTAL == 35.0
    assert SMALL_CART_THRESHOLD == 50.0
    assert PLATFORM_FEE_STANDARD == 3.0
    assert PLATFORM_FEE_SMALL_CART == 5.0

    # 1. Below ₹35 delivery subtotal: item counter price 20 -> app price ceil(20/0.82) = 25
    items_low = [{"id": "tea1", "name": "Tea", "price": 20.0, "quantity": 1}]
    del_breakdown = calculate_order_amounts(items=items_low, delivery_type="HOSTEL_BATCH")
    assert del_breakdown["app_subtotal"] == 25.0
    assert del_breakdown["is_below_min_delivery"] is True
    assert "Minimum cart for hostel delivery is ₹35.00" in del_breakdown["min_delivery_error"]
    assert del_breakdown["platform_fee"] == 5.0
    assert del_breakdown["small_order_fee"] == 0.0

    # 2. Below ₹35 takeaway subtotal: permitted without restriction
    takeaway_breakdown = calculate_order_amounts(items=items_low, delivery_type="COUNTER_TAKEAWAY")
    assert takeaway_breakdown["app_subtotal"] == 25.0
    assert takeaway_breakdown["is_below_min_delivery"] is False
    assert takeaway_breakdown["platform_fee"] == 5.0
    assert takeaway_breakdown["small_order_fee"] == 0.0

    # 3. ₹35 - ₹49.99 delivery subtotal: item counter price 30 -> app price ceil(30/0.82) = 37 (< 50 -> ₹5 tech fee)
    items_mid = [{"id": "s1", "name": "Samosa", "price": 30.0, "quantity": 1}]
    mid_breakdown = calculate_order_amounts(items=items_mid, delivery_type="HOSTEL_BATCH")
    assert mid_breakdown["app_subtotal"] == 37.0
    assert mid_breakdown["is_below_min_delivery"] is False
    assert mid_breakdown["platform_fee"] == 5.00
    assert mid_breakdown["small_order_fee"] == 0.00

    # 4. Reaching ₹50.00 delivery subtotal: item counter price 41 -> app price ceil(41/0.82) = 50 (>= 50 -> ₹3 tech fee)
    items_high = [{"id": "b1", "name": "Burger", "price": 41.0, "quantity": 1}]
    high_breakdown = calculate_order_amounts(items=items_high, delivery_type="HOSTEL_BATCH")
    assert high_breakdown["app_subtotal"] == 50.0
    assert high_breakdown["is_below_min_delivery"] is False
    assert high_breakdown["platform_fee"] == 3.00
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
    assert RIDER_COD_BALANCE_CEILING == 500.0
    assert MAX_UNREMITTED_CASH_LIMIT == 500.0


def test_calibrated_multi_drop_batch_wages():
    """
    Validates calibrated multi-drop batch wage constants and calculation helpers:
    - Primary drop: ₹20.00 base wage
    - Subsequent/Add-on drops: ₹10.00 base wage
    - 1-order run: ₹20.00
    - 2-order batch: ₹30.00 (₹20 + ₹10)
    - 3-order batch: ₹40.00 (₹20 + ₹10 + ₹10)
    """
    assert RIDER_BASE_PAYOUT == 20.0
    assert RIDER_BATCH_ADDON_PAYOUT == 10.0

    # Individual drop calculation
    assert calculate_rider_payout(is_batch_addon=False, tip_amount=0.0) == 20.0
    assert calculate_rider_payout(is_batch_addon=True, tip_amount=0.0) == 10.0
    assert calculate_rider_payout(is_batch_addon=False, tip_amount=15.0) == 35.0
    assert calculate_rider_payout(is_batch_addon=True, tip_amount=5.0) == 15.0
    assert calculate_rider_payout(is_batch_addon=False, tip_amount=0.0, is_takeaway=True) == 0.0

    # Batch earnings helper
    assert calculate_batch_rider_earnings(1) == 20.0
    assert calculate_batch_rider_earnings(2) == 30.0
    assert calculate_batch_rider_earnings(3) == 40.0
    assert calculate_batch_rider_earnings(2, total_tips=10.0) == 40.0


def test_delivery_pool_reconciliation():
    """
    Validates delivery pool differential (delivery_fees_collected - rider_wages_paid):
    - Single order: ₹15 collected - ₹20 wage = -₹5.00 (subsidized by ₹5 tech fee).
    - 2-order batch: 2 × ₹15 = ₹30 collected - ₹30 wage = ₹0.00 (100% self-funding).
    - 3-order batch: 3 × ₹15 = ₹45 collected - ₹40 wage = +₹5.00 delivery surplus.
    """
    # 1. Single Order
    delivery_fees_single = BATCH_DELIVERY_FEE * 1  # 15.0
    rider_wage_single = calculate_batch_rider_earnings(1)  # 20.0
    differential_single = delivery_fees_single - rider_wage_single
    assert differential_single == -5.0

    # 2. Two-Order Batch (Self-funding)
    delivery_fees_batch2 = BATCH_DELIVERY_FEE * 2  # 30.0
    rider_wage_batch2 = calculate_batch_rider_earnings(2)  # 30.0 (20 + 10)
    differential_batch2 = delivery_fees_batch2 - rider_wage_batch2
    assert differential_batch2 == 0.0  # 100% self-funding

    # 3. Three-Order Batch (Surplus)
    delivery_fees_batch3 = BATCH_DELIVERY_FEE * 3  # 45.0
    rider_wage_batch3 = calculate_batch_rider_earnings(3)  # 40.0 (20 + 10 + 10)
    differential_batch3 = delivery_fees_batch3 - rider_wage_batch3
    assert differential_batch3 == 5.0  # +₹5 surplus

