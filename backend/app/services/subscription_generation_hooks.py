"""Post-generation hooks: state persistence and notifications."""

from __future__ import annotations

import asyncio
from datetime import date

from fastapi import BackgroundTasks

from app.models.subscription_generation_state import record_generation_run
from app.services.notification_service import (
    notify_subscription_orders_generated,
    schedule_notification,
)


async def complete_subscription_generation(
    target_date: date,
    result: dict,
    *,
    trigger: str,
    background_tasks: BackgroundTasks | None = None,
) -> None:
    """Record run metadata and queue notifications without blocking generation."""
    await record_generation_run(target_date, result, trigger=trigger)

    if int(result.get("generated_count") or 0) <= 0:
        return

    if background_tasks is not None:
        schedule_notification(
            background_tasks,
            notify_subscription_orders_generated,
            result,
            target_date,
        )
        return

    asyncio.create_task(
        notify_subscription_orders_generated(result, target_date),
        name="subscription-generation-notifications",
    )
