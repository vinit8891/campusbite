"""Smoke tests for Mess Subscription Step 4A (read-only payment records)."""

from __future__ import annotations

import asyncio

from app.models.subscription_payment import (
    get_payments_by_customer,
    get_payments_by_restaurant,
    list_subscription_payments_admin,
)
from app.routes.subscription_payment import (
    admin_router,
    customer_router,
    restaurant_router,
)


async def _run_list_queries():
    customer_items = await get_payments_by_customer("nobody@example.com")
    restaurant_items = await get_payments_by_restaurant("nobody@example.com")
    admin_items = await list_subscription_payments_admin(q="test")
    assert isinstance(customer_items, list)
    assert isinstance(restaurant_items, list)
    assert isinstance(admin_items, list)


def test_model_queries():
    asyncio.run(_run_list_queries())


def test_routes_registered():
    assert len(customer_router.routes) >= 1
    assert len(admin_router.routes) >= 1
    assert len(restaurant_router.routes) >= 1


if __name__ == "__main__":
    test_model_queries()
    test_routes_registered()
    print("ALL STEP 4A SMOKE TESTS PASSED")
