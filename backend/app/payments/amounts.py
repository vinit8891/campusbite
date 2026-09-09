"""Trusted statutory GST and pricing calculation engine (never trust client totals alone)."""

import math
from typing import Any, Literal
from fastapi import HTTPException

# Statutory Tax & Pricing Constants
COMMISSION_RATE = 0.15  # 15% Platform Take-Rate
FOOD_GST_RATE = 0.05    # 5% Food GST
TECH_FEE_DELIVERY = 5.0 # ₹5 for delivered orders
TECH_FEE_TAKEAWAY = 3.0 # ₹3 for counter pass
BATCH_DELIVERY_FEE = 15.0
EXPRESS_DELIVERY_FEE = 40.0
MICRO_CART_THRESHOLD = 80.0
ONLINE_PG_FEE_RATE = 0.0236
DELIVERY_PARTNER_SHARE_RATE = 0.85
RIDER_COD_BALANCE_CEILING = 1000.0


def get_calibrated_app_price(counter_price: float) -> int:
    """Returns calibrated menu price ensuring 100% canteen payout post 15% commission."""
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
) -> dict[str, Any]:
    """
    Authoritative server-side calculation for order totals, statutory GSTs,
    commission splits, rider payouts, and platform margin.
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

    is_takeaway = norm_delivery_type == "COUNTER_TAKEAWAY"
    platform_fee = TECH_FEE_TAKEAWAY if is_takeaway else TECH_FEE_DELIVERY

    if is_takeaway:
        delivery_fee = 0.0
    elif norm_delivery_type == "HOSTEL_BATCH":
        delivery_fee = BATCH_DELIVERY_FEE
    else:
        delivery_fee = EXPRESS_DELIVERY_FEE

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

    # Delivery Partner Earning: 85% delivery fee + 100% of driver tip
    delivery_partner_earning = round(
        round(delivery_fee * DELIVERY_PARTNER_SHARE_RATE, 2) + valid_tip,
        2,
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
        "delivery_type": norm_delivery_type,
        "tip_amount": valid_tip,
        "total_payable": total_payable,
        "total_unrounded": total_unrounded,
        "cod_rounding": cod_rounding,
        "commission_amount": commission_amount,
        "pg_fee": pg_fee,
        "net_restaurant_payout": net_restaurant_payout,
        "delivery_partner_earning": delivery_partner_earning,
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

