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


def test_calculate_courier_order_wage_authoritative():
    """Verify authoritative batch tiered wage calculator in courier_service."""
    from app.services.courier_service import (
        calculate_courier_order_wage,
        apply_courier_batch_wages,
    )

    # 1st order base wage
    assert calculate_courier_order_wage({}, batch_index=0) == 20.0
    assert calculate_courier_order_wage({"is_primary_batch_order": True}, batch_index=0) == 20.0

    # Subsequent bundled orders in the same batch: ₹14.00
    assert calculate_courier_order_wage({}, batch_index=1) == 14.0
    assert calculate_courier_order_wage({"is_primary_batch_order": False}, batch_index=0) == 14.0
    assert calculate_courier_order_wage({"is_batch_addon": True}, batch_index=0) == 14.0
    assert calculate_courier_order_wage({"wage_type": "batch_addon"}, batch_index=0) == 14.0

    # Explicitly assigned batch wage (>= 14.0)
    assert calculate_courier_order_wage({"courier_earning": 14.0}) == 14.0
    assert calculate_courier_order_wage({"courier_earning": 20.0}) == 20.0
    assert calculate_courier_order_wage({"courier_earning": 25.0}) == 25.0


def test_apply_courier_batch_wages_sequencing():
    """Verify batch sequencing enforces ₹20 for 1st order and +₹14 for batch add-ons."""
    from app.services.courier_service import apply_courier_batch_wages

    raw_orders = [
        {"_id": "ord-1", "status": "Assigned"},
        {"_id": "ord-2", "status": "Assigned"},
        {"_id": "ord-3", "status": "Assigned"},
    ]

    sequenced = apply_courier_batch_wages(raw_orders)
    assert len(sequenced) == 3

    # Order 0: primary
    assert sequenced[0]["courier_earning"] == 20.0
    assert sequenced[0]["delivery_partner_earning"] == 20.0
    assert sequenced[0]["wage_type"] == "base"
    assert sequenced[0]["is_primary_batch_order"] is True
    assert sequenced[0]["is_batch_addon"] is False

    # Order 1: secondary
    assert sequenced[1]["courier_earning"] == 14.0
    assert sequenced[1]["delivery_partner_earning"] == 14.0
    assert sequenced[1]["wage_type"] == "batch_addon"
    assert sequenced[1]["is_primary_batch_order"] is False
    assert sequenced[1]["is_batch_addon"] is True

    # Order 2: tertiary
    assert sequenced[2]["courier_earning"] == 14.0
    assert sequenced[2]["delivery_partner_earning"] == 14.0
    assert sequenced[2]["wage_type"] == "batch_addon"
    assert sequenced[2]["is_primary_batch_order"] is False
    assert sequenced[2]["is_batch_addon"] is True


def test_calculate_courier_settlement_wages_aggregation():
    """Verify settlement wages accurately sums ₹20 for primary drops and ₹14 for bundled drops."""
    from app.routes.settlements import calculate_courier_settlement_wages

    completed_orders = [
        {"_id": "ord-1", "courier_earning": 20.0},
        {"_id": "ord-2", "courier_earning": 14.0},
        {"_id": "ord-3"},  # fallback to 20.0
    ]

    total_wages = calculate_courier_settlement_wages(completed_orders)
    assert total_wages == 54.0  # 20 + 14 + 20

