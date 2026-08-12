"""Smoke tests for Mess Subscription Step 4 (billing)."""

from __future__ import annotations

import asyncio
from datetime import date, timedelta

from app.models.subscription_payment import (
    get_admin_payment_summary,
    get_payments_by_customer_paginated,
    get_restaurant_revenue_summary,
)
from app.routes.subscription_billing import router as billing_router
from app.schemas.subscription import compute_subscription_end_date
from app.services.subscription_billing import (
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PAID,
    _compute_renewal_period,
)


def test_billing_routes_registered():
    paths = {route.path for route in billing_router.routes}
    assert "/subscriptions/{subscription_id}/renew" in paths
    assert "/subscriptions/{subscription_id}/verify-renewal" in paths
    assert "/subscriptions/{subscription_id}/retry" in paths


def test_renewal_period_for_new_subscription():
    today = date.today()
    end = compute_subscription_end_date(today, "weekly")
    subscription = {
        "start_date": today.isoformat(),
        "end_date": end.isoformat(),
        "subscription_type": "weekly",
    }
    start, new_end, period = _compute_renewal_period(
        subscription,
        confirm_expired=False,
        has_paid_before=False,
    )
    assert start == today
    assert new_end == end
    assert period == f"{today.isoformat()} to {end.isoformat()}"


def test_renewal_period_requires_confirmation_when_expired():
    today = date.today()
    past_end = today - timedelta(days=3)
    subscription = {
        "start_date": (past_end - timedelta(days=6)).isoformat(),
        "end_date": past_end.isoformat(),
        "subscription_type": "weekly",
    }
    try:
        _compute_renewal_period(
            subscription,
            confirm_expired=False,
            has_paid_before=True,
        )
        raise AssertionError("Expected HTTPException for expired subscription")
    except Exception as exc:
        assert "confirm_expired" in str(exc.detail)


async def _run_read_queries():
    customer_page = await get_payments_by_customer_paginated(
        "nobody@example.com",
        page=1,
        limit=5,
    )
    summary = await get_admin_payment_summary()
    restaurant_summary = await get_restaurant_revenue_summary("nobody@example.com")
    assert "items" in customer_page
    assert "total_subscription_revenue" in summary
    assert "active_subscriptions" in restaurant_summary


def test_read_models():
    asyncio.run(_run_read_queries())


def test_payment_status_constants():
    assert PAYMENT_STATUS_PAID == "paid"
    assert PAYMENT_STATUS_FAILED == "failed"


if __name__ == "__main__":
    test_billing_routes_registered()
    test_renewal_period_for_new_subscription()
    test_renewal_period_requires_confirmation_when_expired()
    test_read_models()
    test_payment_status_constants()
    print("ALL STEP 4 SMOKE TESTS PASSED")
