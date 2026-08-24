import pytest
from fastapi import HTTPException
from app.payments.amounts import (
    calculate_order_amounts,
    calculate_payable_amount,
    assert_client_total_matches,
    RIDER_COD_BALANCE_CEILING,
    FOOD_GST_RATE,
    BUDGET_MEAL_COMMISSION_RATE,
    STANDARD_COMMISSION_RATE,
    ONLINE_PG_FEE_RATE,
    DELIVERY_FEE_HOSTEL_BATCH,
    DELIVERY_FEE_STANDARD,
)


def test_tier_a_budget_meal_hostel_batch_cod():
    """
    Tier A Budget meal test:
    - 1 budget item @ ₹80 (Subtotal <= ₹100 -> ₹3 tech fee)
    - Hostel batch drop (₹15 delivery fee)
    - COD (₹0 PG fee)
    - 5% Food GST + 5% budget meal commission
    """
    items = [
        {"id": "item1", "name": "Mini Thali", "price": 80.0, "quantity": 1, "is_budget_meal": True}
    ]

    breakdown = calculate_order_amounts(
        items=items,
        delivery_type="HOSTEL_BATCH",
        tip_amount=0.0,
        payment_method="COD",
    )

    assert breakdown["food_subtotal"] == 80.0
    assert breakdown["restaurant_gst"] == 4.00  # 5% of 80
    assert breakdown["platform_fee"] == 3.00   # <= 100 subtotal
    assert breakdown["platform_fee_base"] == 2.54  # 3 / 1.18
    assert breakdown["platform_fee_gst"] == 0.46   # 3 - 2.54
    assert breakdown["delivery_fee"] == 15.00  # Hostel Batch Drop
    assert breakdown["tip_amount"] == 0.0
    assert breakdown["total_payable"] == 102.00  # 80 + 4 + 3 + 15

    # Margins & splits
    assert breakdown["commission_amount"] == 4.00  # 5% of 80
    assert breakdown["pg_fee"] == 0.0
    assert breakdown["net_restaurant_payout"] == 80.00  # 80 + 4 - 4
    assert breakdown["delivery_partner_earning"] == 12.75  # 85% of 15
    assert breakdown["net_platform_profit"] == 9.25  # 4 + 3 + (15 - 12.75)


def test_tier_b_standard_meal_express_online_with_tip():
    """
    Tier B Standard meal test:
    - 2 standard items @ ₹150 (Subtotal = ₹300 > ₹100 -> ₹5 tech fee)
    - Standard express delivery (₹40 delivery fee)
    - Tip = ₹20
    - Online payment (2.36% PG fee)
    - 5% Food GST + 10% standard restaurant commission
    """
    items = [
        {"id": "item2", "name": "Biryani Combo", "price": 150.0, "quantity": 2, "is_budget_meal": False}
    ]

    breakdown = calculate_order_amounts(
        items=items,
        delivery_type="STANDARD",
        tip_amount=20.0,
        payment_method="ONLINE",
    )

    assert breakdown["food_subtotal"] == 300.00
    assert breakdown["restaurant_gst"] == 15.00  # 5% of 300
    assert breakdown["platform_fee"] == 5.00    # > 100 subtotal
    assert breakdown["delivery_fee"] == 40.00   # Standard express
    assert breakdown["tip_amount"] == 20.00
    assert breakdown["total_payable"] == 380.00  # 300 + 15 + 40 + 5 + 20

    # Margins & splits
    assert breakdown["commission_amount"] == 30.00  # 10% of 300
    assert breakdown["pg_fee"] == 8.97  # 0.0236 * 380 = 8.968 -> 8.97
    assert breakdown["net_restaurant_payout"] == 285.00  # 300 + 15 - 30
    assert breakdown["delivery_partner_earning"] == 54.00  # (40 * 0.85 = 34) + 20 tip
    assert breakdown["net_platform_profit"] == 12.03  # 30 + 5 + (40 - 54) - 8.97 = 12.03


def test_mixed_budget_and_standard_items():
    """Test mixed cart with 1 budget item and 1 standard item."""
    items = [
        {"id": "b1", "name": "Egg Roll", "price": 50.0, "quantity": 2, "is_budget_meal": True},   # 100 subtotal -> 5% = 5
        {"id": "s1", "name": "Paneer Butter", "price": 150.0, "quantity": 1, "is_budget_meal": False},  # 150 subtotal -> 10% = 15
    ]

    breakdown = calculate_order_amounts(
        items=items,
        delivery_type="HOSTEL_BATCH",
        tip_amount=10.0,
        payment_method="COD",
    )

    assert breakdown["food_subtotal"] == 250.00
    assert breakdown["restaurant_gst"] == 12.50  # 5% of 250
    assert breakdown["platform_fee"] == 5.00    # > 100 subtotal
    assert breakdown["delivery_fee"] == 15.00
    assert breakdown["total_payable"] == 292.50  # 250 + 12.50 + 15 + 5 + 10
    assert breakdown["commission_amount"] == 20.00  # 5.0 + 15.0


def test_calculate_payable_amount_wrapper():
    items = [{"price": 100.0, "quantity": 1, "is_budget_meal": False}]
    total = calculate_payable_amount(
        items=items,
        delivery_type="HOSTEL_BATCH",
        tip_amount=0.0,
        payment_method="COD",
    )
    # 100 + 5 (GST) + 15 (delivery) + 3 (platform) = 123.00
    assert total == 123.00


def test_assert_client_total_matches():
    # Valid match within tolerance
    assert_client_total_matches(123.00, 123.004)

    # Forged total outside tolerance raises 400
    with pytest.raises(HTTPException) as exc_info:
        assert_client_total_matches(100.00, 123.00)
    assert exc_info.value.status_code == 400


def test_rider_cod_balance_ceiling_value():
    assert RIDER_COD_BALANCE_CEILING == 1000.0
