"""Trusted statutory GST and pricing calculation engine (never trust client totals alone)."""

from typing import Any, Literal
from fastapi import HTTPException

# Statutory Tax & Pricing Constants
FOOD_GST_RATE = 0.05
PLATFORM_FEE_LOW = 3.00
PLATFORM_FEE_HIGH = 5.00
DELIVERY_FEE_HOSTEL_BATCH = 15.00
DELIVERY_FEE_STANDARD = 40.00
BUDGET_MEAL_COMMISSION_RATE = 0.05
STANDARD_COMMISSION_RATE = 0.10
ONLINE_PG_FEE_RATE = 0.0236
DELIVERY_PARTNER_SHARE_RATE = 0.85
RIDER_COD_BALANCE_CEILING = 1000.0


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

    food_subtotal = 0.0
    commission_amount = 0.0

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

        item_total = price * quantity
        food_subtotal += item_total

        is_budget = bool(item.get("is_budget_meal", False))
        comm_rate = BUDGET_MEAL_COMMISSION_RATE if is_budget else STANDARD_COMMISSION_RATE
        commission_amount += item_total * comm_rate

    food_subtotal = round(food_subtotal, 2)
    if food_subtotal <= 0:
        raise HTTPException(
            status_code=400,
            detail="Order subtotal must be greater than zero.",
        )

    # 5% Restaurant Food GST
    restaurant_gst = round(FOOD_GST_RATE * food_subtotal, 2)

    # Platform Tech Fee + 18% internal tax breakdown
    platform_fee = PLATFORM_FEE_LOW if food_subtotal <= 100.0 else PLATFORM_FEE_HIGH
    base_fee = round(platform_fee / 1.18, 2)
    platform_gst = round(platform_fee - base_fee, 2)

    # Delivery Fee based on batching mode
    norm_delivery_type = (delivery_type or "HOSTEL_BATCH").strip().upper()
    if norm_delivery_type == "HOSTEL_BATCH":
        delivery_fee = DELIVERY_FEE_HOSTEL_BATCH
    else:
        delivery_fee = DELIVERY_FEE_STANDARD

    valid_tip = round(max(0.0, float(tip_amount or 0.0)), 2)

    total_payable = round(
        food_subtotal + restaurant_gst + delivery_fee + platform_fee + valid_tip,
        2,
    )

    commission_amount = round(commission_amount, 2)

    # Payment Gateway Fee (2.36% on total payable for online transactions)
    norm_payment_method = (payment_method or "COD").strip().upper()
    is_online = norm_payment_method in ("ONLINE", "ONLINE_PAYMENT", "RAZORPAY")
    pg_fee = round(ONLINE_PG_FEE_RATE * total_payable, 2) if is_online else 0.0

    # Net Restaurant Payout: Food Subtotal + Food GST - Commission
    net_restaurant_payout = round(food_subtotal + restaurant_gst - commission_amount, 2)

    # Delivery Partner Earning: 85% delivery fee + 100% of driver tip
    delivery_partner_earning = round(
        round(delivery_fee * DELIVERY_PARTNER_SHARE_RATE, 2) + valid_tip,
        2,
    )

    # Net Platform Margin
    delivery_margin = round(delivery_fee - delivery_partner_earning + valid_tip, 2)  # tip is pass-through
    net_platform_profit = round(
        commission_amount + platform_fee + (delivery_fee - delivery_partner_earning) - pg_fee,
        2,
    )

    return {
        "food_subtotal": food_subtotal,
        "restaurant_gst": restaurant_gst,
        "platform_fee": platform_fee,
        "platform_fee_base": base_fee,
        "platform_fee_gst": platform_gst,
        "delivery_fee": delivery_fee,
        "delivery_type": norm_delivery_type,
        "tip_amount": valid_tip,
        "total_payable": total_payable,
        "commission_amount": commission_amount,
        "pg_fee": pg_fee,
        "net_restaurant_payout": net_restaurant_payout,
        "delivery_partner_earning": delivery_partner_earning,
        "net_platform_profit": net_platform_profit,
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
    tolerance: float = 0.01,
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
