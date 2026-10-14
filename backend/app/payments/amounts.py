"""Trusted statutory GST and pricing calculation engine (never trust client totals alone)."""

import math
from typing import Any, Literal
from fastapi import HTTPException

# Statutory Tax & Pricing Constants
RESTAURANT_COMMISSION_RATE = 0.18  # 18% Standard Restaurant Deduction Rate
CANTEEN_COMMISSION_RATE = 0.18     # 18% platform commission
COMMISSION_RATE = 0.18             # 18% Platform Take-Rate
FOOD_GST_RATE = 0.05               # 5% Food GST

PLATFORM_FEE_STANDARD = 3.0  # Carts >= ₹50
PLATFORM_FEE_SMALL_CART = 5.0  # Carts < ₹50
SMALL_CART_THRESHOLD = 50.0
MIN_DELIVERY_SUBTOTAL = 35.0

TECH_FEE_DELIVERY = 5.0 # Legacy alias
TECH_FEE_TAKEAWAY = 3.0 # Legacy alias
PLATFORM_FEE_DELIVERY = 5.0
PLATFORM_FEE_TAKEAWAY = 3.0
DELIVERY_FEE = 15.0
BATCH_DELIVERY_FEE = 15.0
EXPRESS_DELIVERY_FEE = 40.0
TECH_FEE_TIER_LOW = 5.0
TECH_FEE_TIER_HIGH = 3.0
MICRO_CART_THRESHOLD = 80.0
ONLINE_PG_FEE_RATE = 0.0236

# Courier Compensation & Incentive Constants
RIDER_BASE_PAYOUT = 20.0          # Primary drop wage (₹20.00)
RIDER_BATCH_ADDON_PAYOUT = 14.0   # Secondary/subsequent drop add-on wage (₹14.00)
LARGE_CART_THRESHOLD = 150.0      # Cart food subtotal threshold for heavy cart bonus (₹150.00)
LARGE_CART_RIDER_BONUS = 5.0      # Additional bonus for heavy carts >= ₹150 (+₹5.00)
NIGHT_SURGE_FEE = 10.0            # Night surge (9:30 PM - 1:00 AM IST) 100% to rider (+₹10.00)
RIDER_COD_BALANCE_CEILING = 500.0  # Hard lockout at ₹500 unremitted cash
MAX_UNREMITTED_CASH_LIMIT = 500.0

# Upgraded Streak Milestones
MILESTONE_TIER_1 = {"count": 3, "bonus": 20.0}   # 3 drops = +₹20
MILESTONE_TIER_2 = {"count": 6, "bonus": 50.0}   # 6 drops = +₹50
MILESTONE_TIER_3 = {"count": 10, "bonus": 100.0} # 10 drops = +₹100
RIDER_MILESTONES = [MILESTONE_TIER_1, MILESTONE_TIER_2, MILESTONE_TIER_3]

SMALL_ORDER_THRESHOLD = 50.0
SMALL_ORDER_FEE = 0.0


def calculate_rider_payout(
    subtotal: float = 0.0,
    is_batch_addon: bool = False,
    is_night_surge: bool = False,
    tip: float = 0.0,
    is_takeaway: bool = False,
    tip_amount: float | None = None,
) -> float:
    """Calculates canonical rider wage: ₹20 base (+₹5 if subtotal >= ₹150) or ₹14 batch add-on + surge + 100% tip."""
    if is_takeaway:
        return 0.0
    actual_tip = tip if tip > 0 else (tip_amount or 0.0)
    if is_batch_addon:
        base = RIDER_BATCH_ADDON_PAYOUT  # 14.0
    else:
        base = RIDER_BASE_PAYOUT         # 20.0
        if subtotal >= LARGE_CART_THRESHOLD:
            base += LARGE_CART_RIDER_BONUS  # +5.0

    surge = NIGHT_SURGE_FEE if is_night_surge else 0.0
    return round(base + surge + max(0.0, float(actual_tip)), 2)


def calculate_batch_rider_earnings(
    order_count: int,
    total_tips: float = 0.0,
    large_cart_count: int = 0,
    is_night_surge: bool = False,
) -> float:
    """Calculates total batch rider earnings: ₹20 base + (N-1)*₹14 add-ons + large cart bonuses + tips."""
    if order_count <= 0:
        return 0.0
    wages = RIDER_BASE_PAYOUT + max(0, order_count - 1) * RIDER_BATCH_ADDON_PAYOUT
    wages += large_cart_count * LARGE_CART_RIDER_BONUS
    if is_night_surge:
        wages += NIGHT_SURGE_FEE
    return round(wages + max(0.0, float(total_tips or 0.0)), 2)


def calculate_active_run_wages(orders: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Computes wages for an active run where:
    - The first order is computed as the Base order (RIDER_BASE_PAYOUT = ₹20.00).
    - Subsequent orders to the same drop location / batch are computed as Batch Add-ons (RIDER_BATCH_ADDON_PAYOUT = ₹14.00).
    """
    if not orders:
        return {"total_wages": 0.0, "total_tips": 0.0, "total_payout": 0.0, "order_payouts": []}

    seen_drop_locations: set[str] = set()
    seen_batches: set[str] = set()
    order_payouts: list[dict[str, Any]] = []
    total_wages = 0.0
    total_tips = 0.0

    for idx, o in enumerate(orders):
        batch_id = str(o.get("batch_id") or "").strip()
        loc = str(
            (o.get("delivery_location") or {}).get("building")
            or o.get("hostel_block")
            or o.get("delivery_address")
            or o.get("address")
            or ""
        ).lower().strip()

        tip = float(o.get("tip_amount") or o.get("tip") or (o.get("pricing_breakdown") or {}).get("tip_amount") or 0.0)
        subtotal = float(o.get("food_subtotal") or o.get("subtotal") or (o.get("pricing_breakdown") or {}).get("food_subtotal") or 0.0)
        is_night_surge = bool(o.get("is_night_surge") or (o.get("pricing_breakdown") or {}).get("is_night_surge"))

        # First order in run is Base order; subsequent orders to the same drop location/batch are Batch Add-ons
        if idx == 0:
            is_addon = False
        elif batch_id and batch_id in seen_batches:
            is_addon = True
        elif loc and loc in seen_drop_locations:
            is_addon = True
        elif bool(o.get("is_batch_addon") or o.get("isBatchAddon")):
            is_addon = True
        elif o.get("is_primary_batch_order") is False:
            is_addon = True
        else:
            is_addon = False

        if batch_id:
            seen_batches.add(batch_id)
        if loc:
            seen_drop_locations.add(loc)

        payout = calculate_rider_payout(
            subtotal=subtotal,
            is_batch_addon=is_addon,
            is_night_surge=is_night_surge,
            tip=tip,
        )
        base_wage = round(payout - tip, 2)
        total_wages += base_wage
        total_tips += tip

        order_payouts.append({
            "order_id": str(o.get("_id") or o.get("id") or ""),
            "is_base_order": not is_addon,
            "is_batch_addon": is_addon,
            "is_addon": is_addon,
            "base_wage": base_wage,
            "tip": tip,
            "total_payout": payout,
            "wage_label": "Base guaranteed run fee" if not is_addon else f"Batch add-on drop (+₹{int(RIDER_BATCH_ADDON_PAYOUT)})",
        })

    return {
        "total_wages": round(total_wages, 2),
        "total_tips": round(total_tips, 2),
        "total_payout": round(total_wages + total_tips, 2),
        "order_payouts": order_payouts,
    }


def get_calibrated_app_price(counter_price: float) -> int:
    """Returns calibrated menu price ensuring 100% canteen payout post 18% commission."""
    return math.ceil(counter_price / (1.0 - COMMISSION_RATE))


def calculate_cod_rounding(total: float) -> dict[str, Any]:
    """Rounds COD total to whole rupee and returns round-off delta."""
    rounded_total = int(round(total))
    round_off = round(float(rounded_total) - total, 2)
    return {"rounded_total": rounded_total, "round_off": round_off}


def calculate_order_amounts(
    items: list[dict[str, Any]],
    delivery_type: str = "HOSTEL_BATCH",
    tip_amount: float = 0.0,
    payment_method: str = "COD",
    is_batch_addon: bool = False,
    is_night_surge: bool = False,
) -> dict[str, Any]:
    """
    Authoritative server-side calculation for order totals, statutory GSTs,
    dynamic platform tech fees, commission splits, rider payouts, and platform margin.
    """
    if not items:
        raise HTTPException(
            status_code=400,
            detail="Order must include at least one item.",
        )

    app_subtotal = 0.0
    canteen_counter_base = 0.0

    for item in items:
        try:
            price = float(item.get("price", 0))
            quantity = int(item.get("quantity", 0))
        except (TypeError, ValueError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid item price or quantity.",
            ) from None

        if price < 0 or quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Item price and quantity must be positive.",
            )

        calibrated_unit = get_calibrated_app_price(price)
        app_subtotal += calibrated_unit * quantity
        canteen_counter_base += price * quantity

    app_subtotal = round(app_subtotal, 2)
    canteen_counter_base = round(canteen_counter_base, 2)
    if app_subtotal <= 0:
        raise HTTPException(
            status_code=400,
            detail="Order subtotal must be greater than zero.",
        )

    norm_delivery_type = (delivery_type or "HOSTEL_BATCH").strip().upper()
    if norm_delivery_type == "STANDARD":
        norm_delivery_type = "EXPRESS_DOOR"

    is_takeaway = norm_delivery_type in ("COUNTER_TAKEAWAY", "TAKEAWAY", "PICKUP")
    is_delivery = not is_takeaway

    # Dynamic Platform Tech Fee: ₹5 for carts < ₹50, ₹3 for carts >= ₹50
    platform_fee = (
        PLATFORM_FEE_SMALL_CART if app_subtotal < SMALL_CART_THRESHOLD else PLATFORM_FEE_STANDARD
    )

    if is_takeaway:
        delivery_fee = 0.0
        small_order_fee = 0.0
        is_below_min_delivery = False
        min_delivery_error = None
    else:
        if norm_delivery_type == "HOSTEL_BATCH":
            delivery_fee = BATCH_DELIVERY_FEE
        else:
            delivery_fee = EXPRESS_DELIVERY_FEE

        is_below_min_delivery = 0.0 < app_subtotal < MIN_DELIVERY_SUBTOTAL
        min_delivery_error = (
            "Minimum cart for hostel delivery is ₹35.00. Add items or switch to Counter Takeaway."
            if is_below_min_delivery
            else None
        )
        small_order_fee = 0.0

    # 5% Restaurant Food GST on calibrated app subtotal
    gst_amount = round(FOOD_GST_RATE * app_subtotal, 2)

    valid_tip = round(max(0.0, float(tip_amount or 0.0)), 2)

    total_unrounded = round(
        app_subtotal + gst_amount + platform_fee + delivery_fee + valid_tip,
        2,
    )

    norm_payment_method = (payment_method or "COD").strip().upper()
    is_online = norm_payment_method in ("ONLINE", "ONLINE_PAYMENT", "RAZORPAY")
    is_cod = not is_online

    if is_cod:
        cod_rounding = calculate_cod_rounding(total_unrounded)
        total_payable = float(cod_rounding["rounded_total"])
    else:
        cod_rounding = None
        total_payable = total_unrounded

    pg_fee = round(ONLINE_PG_FEE_RATE * total_payable, 2) if is_online else 0.0

    # Net Restaurant Payout: 100% Canteen counter base + GST pass-through
    net_restaurant_payout = round(canteen_counter_base + gst_amount, 2)

    # Delivery Partner Earning: ₹20 base (+₹5 if subtotal >= ₹150) or ₹14 add-on + surge + 100% tip (only if delivery is requested)
    delivery_partner_earning = calculate_rider_payout(
        subtotal=app_subtotal,
        is_batch_addon=is_batch_addon,
        is_night_surge=is_night_surge,
        tip=valid_tip,
        is_takeaway=is_takeaway,
    )

    # Net Platform Margin
    commission_amount = round(app_subtotal - canteen_counter_base, 2)
    net_platform_profit = round(
        commission_amount + platform_fee + (delivery_fee - delivery_partner_earning) - pg_fee,
        2,
    )

    return {
        "app_subtotal": app_subtotal,
        "food_subtotal": app_subtotal,
        "canteen_counter_base": canteen_counter_base,
        "restaurant_gst": gst_amount,
        "gst_amount": gst_amount,
        "platform_fee": platform_fee,
        "delivery_fee": delivery_fee,
        "small_order_fee": small_order_fee,
        "is_below_min_delivery": is_below_min_delivery,
        "min_delivery_error": min_delivery_error,
        "delivery_type": norm_delivery_type,
        "is_batch_addon": is_batch_addon,
        "tip_amount": valid_tip,
        "total_payable": total_payable,
        "total_unrounded": total_unrounded,
        "cod_rounding": cod_rounding,
        "commission_amount": commission_amount,
        "pg_fee": pg_fee,
        "net_restaurant_payout": net_restaurant_payout,
        "delivery_partner_earning": delivery_partner_earning,
        "delivery_partner_payout": delivery_partner_earning,
        "net_platform_profit": net_platform_profit,
        "canteen_payout": {
            "base_food": canteen_counter_base,
            "gst_pass_through": gst_amount,
            "total_disbursal": net_restaurant_payout,
        },
    }


def calculate_payable_amount(
    items: list,
    delivery_fee: float | None = None,
    delivery_type: str = "HOSTEL_BATCH",
    tip_amount: float = 0.0,
    payment_method: str = "COD",
) -> float:
    """Convenience helper returning total payable amount."""
    breakdown = calculate_order_amounts(
        items=items,
        delivery_type=delivery_type,
        tip_amount=tip_amount,
        payment_method=payment_method,
    )
    return breakdown["total_payable"]


def to_paise(amount_rupees: float) -> int:
    return int(round(float(amount_rupees) * 100))


def from_paise(amount_paise: int) -> float:
    return round(int(amount_paise) / 100.0, 2)


def assert_client_total_matches(
    client_total: float | None,
    server_total: float,
    tolerance: float = 0.05,
) -> None:
    """Reject requests that try to under/over-pay via a forged total."""
    if client_total is None:
        return
    try:
        client_value = float(client_total)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid order total.",
        ) from None

    if abs(client_value - server_total) > tolerance:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Order amount mismatch (client: {client_value}, calculated: {server_total}). "
                "Payable amount is calculated server-side and cannot be overridden."
            ),
        )

