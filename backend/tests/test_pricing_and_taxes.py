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
)


def test_poha_batch_drop_cod():
    """
    Poha test (Counter ₹35):
    - Calibrated price = ceil(35 / 0.85) = 42
    - Hostel batch delivery = ₹15
    - Platform tech fee = ₹5
    - Food GST 5% = 2.10
    - Unrounded total = 42 + 2.10 + 5 + 15 = 64.10
    - COD rounded total = ₹64 (roundOff: -0.10)
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

    assert breakdown["app_subtotal"] == 42.0
    assert breakdown["canteen_counter_base"] == 35.0
    assert breakdown["gst_amount"] == 2.10
    assert breakdown["platform_fee"] == 5.00
    assert breakdown["delivery_fee"] == 15.00
    assert breakdown["total_unrounded"] == 64.10
    assert breakdown["total_payable"] == 64.0  # COD rounded to whole rupee
    assert breakdown["cod_rounding"]["round_off"] == -0.10
    assert breakdown["canteen_payout"]["base_food"] == 35.0
    assert breakdown["canteen_payout"]["total_disbursal"] == 37.10


def test_chapati_bhaji_batch_drop_cod():
    """
    Chapati Bhaji test (Counter ₹60):
    - Calibrated price = ceil(60 / 0.85) = 71
    - Hostel batch delivery = ₹15
    - Tech fee = ₹5
    - GST 5% = 3.55
    - Unrounded = 71 + 3.55 + 5 + 15 = 94.55
    - COD rounded = ₹95 (roundOff: +0.45)
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

    assert breakdown["app_subtotal"] == 71.0
    assert breakdown["canteen_counter_base"] == 60.0
    assert breakdown["gst_amount"] == 3.55
    assert breakdown["platform_fee"] == 5.00
    assert breakdown["delivery_fee"] == 15.00
    assert breakdown["total_unrounded"] == 94.55
    assert breakdown["total_payable"] == 95.0
    assert breakdown["cod_rounding"]["round_off"] == 0.45


def test_rice_plate_express_online_with_tip():
    """
    Rice Plate test (Counter ₹80):
    - Calibrated price = ceil(80 / 0.85) = 95
    - Express delivery = ₹40
    - Tech fee = ₹5
    - Tip = ₹20
    - GST 5% = 4.75
    - Online total = 95 + 4.75 + 5 + 40 + 20 = 164.75
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

    assert breakdown["app_subtotal"] == 95.0
    assert breakdown["canteen_counter_base"] == 80.0
    assert breakdown["gst_amount"] == 4.75
    assert breakdown["platform_fee"] == 5.00
    assert breakdown["delivery_fee"] == 40.00
    assert breakdown["tip_amount"] == 20.00
    assert breakdown["total_payable"] == 164.75
    assert breakdown["cod_rounding"] is None


def test_counter_takeaway_mode():
    """
    Counter Takeaway test:
    - ₹0 delivery fee
    - ₹3 platform pass
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
    assert breakdown["total_payable"] == 47.10  # 42 + 2.10 + 3


def test_assert_client_total_matches():
    # Valid match within 0.05 tolerance
    assert_client_total_matches(64.00, 64.02, tolerance=0.05)

    # Forged total outside tolerance raises 400
    with pytest.raises(HTTPException) as exc_info:
        assert_client_total_matches(50.00, 64.00, tolerance=0.05)
    assert exc_info.value.status_code == 400


def test_rider_cod_balance_ceiling_value():
    assert RIDER_COD_BALANCE_CEILING == 1000.0

