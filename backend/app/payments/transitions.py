"""Payment status transition helpers."""

from fastapi import HTTPException

from app.payments.constants import (
    PAYMENT_STATUS_TRANSITIONS,
    PAYMENT_STATUSES,
)


def can_transition(current: str, new_status: str) -> bool:
    if current == new_status:
        return True
    if new_status not in PAYMENT_STATUSES:
        return False
    return new_status in PAYMENT_STATUS_TRANSITIONS.get(current, set())


def assert_can_transition(current: str, new_status: str) -> None:
    if can_transition(current, new_status):
        return
    raise HTTPException(
        status_code=400,
        detail=(
            f"Invalid payment status transition: {current} → {new_status}."
        ),
    )
