"""Smoke tests for subscription billing production hardening."""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, patch

from app.models.subscription import apply_subscription_renewal_once, subscription_matches_renewal
from app.models.subscription_payment import (
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_PROCESSING,
    mark_subscription_payment_paid_once,
)
from app.schemas.subscription import compute_subscription_end_date
from app.services.subscription_billing import (
    _compute_renewal_period,
    _repair_incomplete_renewal,
)


def test_renewal_period_for_new_subscription():
    today = date.today()
    end = compute_subscription_end_date(today, "weekly")
    subscription = {
        "start_date": today.isoformat(),
        "end_date": end.isoformat(),
        "subscription_type": "weekly",
    }
    start, new_end, _period = _compute_renewal_period(
        subscription,
        confirm_expired=False,
        has_paid_before=False,
    )
    assert start == today
    assert new_end == end


def test_subscription_matches_renewal():
    subscription = {
        "end_date": "2026-08-20",
        "payment_status": "paid",
    }
    payment = {
        "renewal_end": "2026-08-20",
        "subscription_synced": True,
    }
    assert subscription_matches_renewal(subscription, payment) is True


def test_subscription_mismatch_detects_unextended_period():
    subscription = {
        "end_date": "2026-08-01",
        "payment_status": "processing",
    }
    payment = {
        "renewal_end": "2026-08-20",
        "subscription_synced": False,
    }
    assert subscription_matches_renewal(subscription, payment) is False


def test_payment_status_constants():
    assert PAYMENT_STATUS_PAID == "paid"
    assert PAYMENT_STATUS_FAILED == "failed"
    assert PAYMENT_STATUS_PROCESSING == "processing"


async def _run_async_tests():
    outcome, _ = await apply_subscription_renewal_once(
        "000000000000000000000000",
        renewal_end="2099-01-01",
    )
    assert outcome == "not_found"

    changed, payment = await mark_subscription_payment_paid_once(
        "000000000000000000000000",
        razorpay_order_id="order_test",
        razorpay_payment_id="pay_test",
        razorpay_signature="sig",
        paid_at=datetime.now(UTC),
        renewal_due="2099-01-01",
    )
    assert changed is False
    assert payment is None

    subscription = {
        "subscription_id": "sub123",
        "end_date": "2026-08-01",
        "payment_status": "processing",
        "status": "active",
    }
    payment_doc = {
        "payment_id": "pay123",
        "renewal_end": "2026-08-20",
        "renewal_due": "2026-08-20",
        "subscription_synced": False,
        "payment_status": "paid",
    }

    async def _fake_transaction(callback):
        return await callback(None)

    with patch(
        "app.services.subscription_billing.run_optional_transaction",
        new=AsyncMock(side_effect=_fake_transaction),
    ), patch(
        "app.services.subscription_billing._sync_subscription_from_payment",
        new=AsyncMock(
            return_value=(
                "changed",
                {
                    "subscription_id": "sub123",
                    "end_date": "2026-08-20",
                    "payment_status": "paid",
                },
            )
        ),
    ), patch(
        "app.services.subscription_billing.get_subscription_by_id",
        new=AsyncMock(
            return_value={
                "subscription_id": "sub123",
                "end_date": "2026-08-20",
                "payment_status": "paid",
            }
        ),
    ):
        result = await _repair_incomplete_renewal(subscription, payment_doc)
        assert result["success"] is True
        assert result["recovered"] is True


def test_async_hardening_paths():
    asyncio.run(_run_async_tests())


if __name__ == "__main__":
    test_renewal_period_for_new_subscription()
    test_subscription_matches_renewal()
    test_subscription_mismatch_detects_unextended_period()
    test_payment_status_constants()
    test_async_hardening_paths()
    print("ALL BILLING HARDENING SMOKE TESTS PASSED")
