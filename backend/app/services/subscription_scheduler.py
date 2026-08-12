"""Daily scheduler that invokes subscription order generation."""

from __future__ import annotations

import asyncio
import os
from datetime import date, datetime, time, timedelta

from app.core.logging import get_logger
from app.services.subscription_generation_hooks import complete_subscription_generation
from app.services.subscription_order_generator import generate_subscription_orders

logger = get_logger(__name__)

DEFAULT_GENERATION_TIME = "00:05"
ENV_GENERATION_TIME = "SUBSCRIPTION_GENERATION_TIME"
ENV_SCHEDULER_ENABLED = "SUBSCRIPTION_SCHEDULER_ENABLED"

_scheduler_task: asyncio.Task | None = None


def _is_scheduler_enabled() -> bool:
    value = (os.getenv(ENV_SCHEDULER_ENABLED) or "true").strip().lower()
    return value in {"1", "true", "yes", "on"}


def parse_generation_time(raw: str | None = None) -> time:
    """Parse HH:MM (24h) schedule time. Defaults to 00:05."""
    value = (raw if raw is not None else os.getenv(ENV_GENERATION_TIME, DEFAULT_GENERATION_TIME)).strip()
    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError(
            f"{ENV_GENERATION_TIME} must be HH:MM (got {value!r})"
        )
    hour_text, minute_text = parts
    if not hour_text.isdigit() or not minute_text.isdigit():
        raise ValueError(
            f"{ENV_GENERATION_TIME} must be HH:MM (got {value!r})"
        )
    hour, minute = int(hour_text), int(minute_text)
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError(
            f"{ENV_GENERATION_TIME} must be a valid time (got {value!r})"
        )
    return time(hour=hour, minute=minute)


def scheduled_run_datetime(day: date, run_time: time) -> datetime:
    return datetime.combine(day, run_time)


def is_past_todays_generation(
    now: datetime,
    run_time: time,
) -> bool:
    """True when server local time is on or after today's scheduled run."""
    return now >= scheduled_run_datetime(now.date(), run_time)


def next_scheduled_run(
    now: datetime,
    run_time: time,
) -> datetime:
    """Next local run datetime strictly in the future (or now at exact match)."""
    today_run = scheduled_run_datetime(now.date(), run_time)
    if now < today_run:
        return today_run
    return scheduled_run_datetime(now.date() + timedelta(days=1), run_time)


async def _execute_generation(target_date: date) -> None:
    logger.info("subscription scheduler generation start date=%s", target_date.isoformat())
    try:
        result = await generate_subscription_orders(target_date)
        await complete_subscription_generation(
            target_date,
            result,
            trigger="scheduler",
        )
        logger.info(
            "subscription scheduler generation completed date=%s generated_count=%s skipped_count=%s",
            target_date.isoformat(),
            result.get("generated_count", 0),
            result.get("skipped_count", 0),
        )
    except Exception:
        logger.exception(
            "subscription scheduler generation failed date=%s",
            target_date.isoformat(),
        )


async def _scheduler_loop() -> None:
    while True:
        run_time = parse_generation_time()
        now = datetime.now()
        next_run = next_scheduled_run(now, run_time)
        wait_seconds = max(0.0, (next_run - now).total_seconds())

        logger.info(
            "subscription scheduler next execution at=%s",
            next_run.isoformat(timespec="minutes"),
        )

        await asyncio.sleep(wait_seconds)
        await _execute_generation(date.today())


async def start_subscription_scheduler() -> None:
    """Start daily subscription order generation (idempotent)."""
    global _scheduler_task

    if not _is_scheduler_enabled():
        logger.info("subscription scheduler disabled via %s", ENV_SCHEDULER_ENABLED)
        return

    if _scheduler_task and not _scheduler_task.done():
        logger.info("subscription scheduler already running")
        return

    try:
        run_time = parse_generation_time()
    except ValueError as exc:
        logger.error("subscription scheduler failed to start: %s", exc)
        return

    logger.info(
        "subscription scheduler started daily_time=%s",
        run_time.strftime("%H:%M"),
    )

    now = datetime.now()
    if is_past_todays_generation(now, run_time):
        logger.info(
            "subscription scheduler missed startup catch-up date=%s",
            now.date().isoformat(),
        )
        await _execute_generation(now.date())

    _scheduler_task = asyncio.create_task(
        _scheduler_loop(),
        name="subscription-order-scheduler",
    )


async def stop_subscription_scheduler() -> None:
    """Cancel the scheduler task during application shutdown."""
    global _scheduler_task

    if _scheduler_task is None:
        return

    _scheduler_task.cancel()
    try:
        await _scheduler_task
    except asyncio.CancelledError:
        pass
    finally:
        _scheduler_task = None
        logger.info("subscription scheduler stopped")


def get_scheduler_status() -> dict:
    """Read-only scheduler status for admin dashboards."""
    enabled = _is_scheduler_enabled()
    running = _scheduler_task is not None and not _scheduler_task.done()

    try:
        run_time = parse_generation_time()
        daily_time = run_time.strftime("%H:%M")
        next_execution = next_scheduled_run(datetime.now(), run_time).isoformat(
            timespec="minutes"
        )
    except ValueError:
        daily_time = None
        next_execution = None

    if not enabled:
        status = "disabled"
    elif running:
        status = "running"
    else:
        status = "stopped"

    return {
        "enabled": enabled,
        "running": running,
        "status": status,
        "daily_time": daily_time,
        "next_execution": next_execution,
    }
