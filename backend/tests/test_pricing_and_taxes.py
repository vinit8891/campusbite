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
    - Calibrated price = ceil(35 / 0.82) = 43
    - Hostel batch delivery = ₹15
    - Platform tech fee = ₹5
    - Food GST 5% = 2.15
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
    assert breakdown["total_unrounded"] == 65.15
    assert breakdown["total_payable"] == 65.0  # COD rounded to whole rupee
    assert breakdown["cod_rounding"]["round_off"] == -0.15
    assert breakdown["canteen_payout"]["base_food"] == 35.0
    assert breakdown["canteen_payout"]["total_disbursal"] == 37.15


def test_chapati_bhaji_batch_drop_cod():
    """
    Chapati Bhaji test (Counter ₹60):
    - Calibrated price = ceil(60 / 0.82) = 74
    - Hostel batch delivery = ₹15
    - Tech fee = ₹5
    - GST 5% = 3.70
    - Unrounded = 74 + 3.70 + 5 + 15 = 97.70
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
    - Online total = 98 + 4.90 + 5 + 40 + 20 = 167.90
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
    assert breakdown["tip_amount"] == 20.00
    assert breakdown["total_payable"] == 167.90
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
    assert breakdown["total_payable"] == 48.15  # 43 + 2.15 + 3


def test_canonical_18_percent_commission():
    assert COMMISSION_RATE == 0.18
    from app.payments.amounts import RESTAURANT_COMMISSION_RATE
    assert RESTAURANT_COMMISSION_RATE == 0.18

    # ₹100 order simulation:
    # Gross Food: ₹100.00
    # 5% Food GST: +₹5.00
    # 18% CampusBite Cut: -₹18.00
    # Net Canteen Disbursal: ₹87.00
    gross_food = 100.00
    food_gst = round(FOOD_GST_RATE * gross_food, 2)
    commission = round(RESTAURANT_COMMISSION_RATE * gross_food, 2)
    net_disbursal = round(gross_food + food_gst - commission, 2)

    assert food_gst == 5.00
    assert commission == 18.00
    assert net_disbursal == 87.00


def test_assert_client_total_matches():
    # Valid match within 0.05 tolerance
    assert_client_total_matches(65.00, 65.02, tolerance=0.05)

    # Forged total outside tolerance raises 400
    with pytest.raises(HTTPException) as exc_info:
        assert_client_total_matches(50.00, 65.00, tolerance=0.05)
    assert exc_info.value.status_code == 400


def test_rider_cod_balance_ceiling_value():
    assert RIDER_COD_BALANCE_CEILING == 1000.0

