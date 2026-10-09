"""Unit tests for Courier Compensation and Incentive Engine with enhanced loss-proof payouts."""

from __future__ import annotations

import pytest

from app.payments.amounts import (
    DELIVERY_FEE,
    TECH_FEE_TIER_LOW,
    TECH_FEE_TIER_HIGH,
    RIDER_BASE_PAYOUT,
    RIDER_BATCH_ADDON_PAYOUT,
    LARGE_CART_THRESHOLD,
    LARGE_CART_RIDER_BONUS,
    NIGHT_SURGE_FEE,
    MILESTONE_TIER_1,
    MILESTONE_TIER_2,
    MILESTONE_TIER_3,
    RIDER_MILESTONES,
    calculate_rider_payout,
    calculate_batch_rider_earnings,
    calculate_order_amounts,
)


def test_canonical_rates_and_constants():
    """Verify customer fees, courier wage constants, and milestones."""
    # Customer fees unchanged
    assert DELIVERY_FEE == 15.00
    assert TECH_FEE_TIER_LOW == 5.00
    assert TECH_FEE_TIER_HIGH == 3.00

    # Courier base and add-on payouts
    assert RIDER_BASE_PAYOUT == 20.00
    assert RIDER_BATCH_ADDON_PAYOUT == 14.00
    assert LARGE_CART_THRESHOLD == 150.00
    assert LARGE_CART_RIDER_BONUS == 5.00
    assert NIGHT_SURGE_FEE == 10.00

    # Upgraded Milestones
    assert MILESTONE_TIER_1 == {"count": 3, "bonus": 20.0}
    assert MILESTONE_TIER_2 == {"count": 6, "bonus": 50.0}
    assert MILESTONE_TIER_3 == {"count": 10, "bonus": 100.0}
    assert len(RIDER_MILESTONES) == 3


def test_calculate_rider_payout_standard_delivery():
    """Verify standard primary drop earns ₹20.00."""
    payout = calculate_rider_payout(subtotal=80.0, is_batch_addon=False, is_night_surge=False, tip=0.0)
    assert payout == 20.00


def test_calculate_rider_payout_batch_addon():
    """Verify batch add-on drop earns bumped ₹14.00 rate."""
    payout = calculate_rider_payout(subtotal=80.0, is_batch_addon=True, is_night_surge=False, tip=0.0)
    assert payout == 14.00


def test_calculate_rider_payout_large_cart_bonus():
    """Verify +₹5 Large Cart Rider Bonus on orders with subtotal >= ₹150."""
    # Exactly ₹150
    assert calculate_rider_payout(subtotal=150.0, is_batch_addon=False) == 25.00

    # Above ₹150
    assert calculate_rider_payout(subtotal=220.0, is_batch_addon=False) == 25.00

    # Below ₹150 threshold
    assert calculate_rider_payout(subtotal=149.99, is_batch_addon=False) == 20.00


def test_calculate_rider_payout_batch_addon_large_cart_no_double_dip():
    """Verify large cart bonus applies only to base orders, not batch add-ons."""
    assert calculate_rider_payout(subtotal=250.0, is_batch_addon=True) == 14.00


def test_calculate_rider_payout_night_surge_and_tips():
    """Verify +₹10 night surge fee and 100% tip pass-through."""
    # Night surge only
    surge_payout = calculate_rider_payout(subtotal=70.0, is_night_surge=True)
    assert surge_payout == 30.00  # 20 + 10

    # Large cart + night surge + tip
    stacked = calculate_rider_payout(
        subtotal=180.0,
        is_batch_addon=False,
        is_night_surge=True,
        tip=15.0,
    )
    assert stacked == 50.00  # 20 (base) + 5 (large) + 10 (surge) + 15 (tip)


def test_calculate_rider_payout_takeaway():
    """Verify takeaway orders have zero rider payout."""
    takeaway_payout = calculate_rider_payout(subtotal=200.0, is_takeaway=True, tip=10.0, is_night_surge=True)
    assert takeaway_payout == 0.00


def test_calculate_batch_rider_earnings():
    """Verify bundled batch calculation for 2-drop and 3-drop clusters."""
    # 1 drop: ₹20.00
    assert calculate_batch_rider_earnings(1) == 20.00

    # 2 drops: ₹20 base + ₹14 addon = ₹34.00
    assert calculate_batch_rider_earnings(2) == 34.00

    # 3 drops: ₹20 base + 2 * ₹14 addon = ₹48.00
    assert calculate_batch_rider_earnings(3) == 48.00

    # 3 drops with 1 heavy cart, night surge, and ₹20 tip: 48 + 5 + 10 + 20 = ₹83.00
    assert calculate_batch_rider_earnings(3, total_tips=20.0, large_cart_count=1, is_night_surge=True) == 83.00


def test_calculate_order_amounts_integration():
    """Verify calculate_order_amounts integrates new rider rates properly."""
    # Counter price 132 -> calibrated app price = 161 (>= ₹150 threshold)
    items = [{"price": 132.0, "quantity": 1}]
    amounts = calculate_order_amounts(
        items=items,
        delivery_type="HOSTEL_BATCH",
        tip_amount=10.0,
        payment_method="ONLINE",
        is_batch_addon=False,
        is_night_surge=True,
    )
    # Rider payout = 20 (base) + 5 (large cart bonus) + 10 (night surge) + 10 (tip) = 45.00
    assert amounts["delivery_partner_earning"] == 45.00
    assert amounts["delivery_partner_payout"] == 45.00
