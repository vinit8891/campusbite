"""Trusted order amount calculation (never trust client totals alone)."""

from fastapi import HTTPException

from app.payments.constants import DEFAULT_DELIVERY_FEE


def calculate_payable_amount(
    items: list,
    delivery_fee: float = DEFAULT_DELIVERY_FEE,
) -> float:
    if not items:
        raise HTTPException(
            status_code=400,
            detail="Order must include at least one item.",
        )

    subtotal = 0.0
    for item in items:
        try:
            price = float(item.get("price"))
            quantity = int(item.get("quantity"))
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
        subtotal += price * quantity

    if subtotal <= 0:
        raise HTTPException(
            status_code=400,
            detail="Order subtotal must be greater than zero.",
        )

    return round(subtotal + float(delivery_fee), 2)


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
                "Order amount mismatch. Payable amount is calculated "
                "server-side and cannot be overridden."
            ),
        )
