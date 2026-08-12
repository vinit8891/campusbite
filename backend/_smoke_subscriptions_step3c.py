"""Smoke tests for Mess Subscription Step 3C notifications and hooks."""

from __future__ import annotations

import asyncio
from datetime import date
from unittest.mock import AsyncMock, patch

from app.services.subscription_generation_hooks import complete_subscription_generation


async def _test_hooks_use_notifications():
    result = {
        "generated_count": 1,
        "skipped_count": 0,
        "order_ids": ["abc123"],
    }

    with patch(
        "app.services.subscription_generation_hooks.record_generation_run",
        new_callable=AsyncMock,
    ) as mock_record:
        with patch(
            "app.services.subscription_generation_hooks.notify_subscription_orders_generated",
            new_callable=AsyncMock,
        ) as mock_notify:
            await complete_subscription_generation(
                date(2026, 8, 13),
                result,
                trigger="manual",
            )
            await asyncio.sleep(0)

    mock_record.assert_awaited_once()
    mock_notify.assert_awaited_once_with(result, date(2026, 8, 13))


def test_hooks_queue_notifications():
    asyncio.run(_test_hooks_use_notifications())


def test_templates_render():
    from app.services.notification_templates import (
        TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_CUSTOMER,
        TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_RESTAURANT,
        render_template,
    )

    subject, body = render_template(
        TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_CUSTOMER,
        {
            "customer_name": "Alex",
            "order_id": "123",
            "restaurant_email": "mess@example.com",
            "status": "Accepted",
            "meal_name": "Lunch Plan",
            "target_date": "2026-08-13",
        },
    )
    assert "scheduled" in subject.lower()
    assert "Lunch Plan" in body

    subject2, body2 = render_template(
        TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_RESTAURANT,
        {"target_date": "2026-08-13", "meal_count": 3},
    )
    assert "subscription" in subject2.lower()
    assert "3" in body2


if __name__ == "__main__":
    test_hooks_queue_notifications()
    test_templates_render()
    print("ALL STEP 3C SMOKE TESTS PASSED")
