"""Unit tests for subscription scheduler helpers (no server required)."""

from __future__ import annotations

import asyncio
from datetime import date, datetime, time
from unittest.mock import AsyncMock, patch

from app.services.subscription_scheduler import (
    is_past_todays_generation,
    next_scheduled_run,
    parse_generation_time,
    start_subscription_scheduler,
    stop_subscription_scheduler,
)


def test_parse_generation_time_default():
    assert parse_generation_time("00:05") == time(0, 5)


def test_parse_generation_time_custom():
    assert parse_generation_time("14:30") == time(14, 30)


def test_is_past_todays_generation():
    run_time = time(0, 5)
    assert is_past_todays_generation(datetime(2026, 8, 13, 10, 0), run_time)
    assert not is_past_todays_generation(datetime(2026, 8, 13, 0, 4), run_time)


def test_next_scheduled_run_before_today():
    run_time = time(0, 5)
    now = datetime(2026, 8, 13, 0, 1)
    assert next_scheduled_run(now, run_time) == datetime(2026, 8, 13, 0, 5)


def test_next_scheduled_run_after_today():
    run_time = time(0, 5)
    now = datetime(2026, 8, 13, 12, 0)
    assert next_scheduled_run(now, run_time) == datetime(2026, 8, 14, 0, 5)


async def _run_missed_startup_test():
    with patch(
        "app.services.subscription_scheduler.generate_subscription_orders",
        new_callable=AsyncMock,
    ) as mock_generate:
        mock_generate.return_value = {
            "generated_count": 0,
            "skipped_count": 0,
            "order_ids": [],
        }

        async def _noop_loop():
            return

        with patch(
            "app.services.subscription_scheduler.parse_generation_time",
            return_value=time(0, 5),
        ):
            with patch(
                "app.services.subscription_scheduler._scheduler_loop",
                _noop_loop,
            ):
                with patch(
                    "app.services.subscription_scheduler.datetime"
                ) as mock_datetime:
                    mock_datetime.now.return_value = datetime(2026, 8, 13, 9, 0)
                    mock_datetime.combine = datetime.combine

                    await start_subscription_scheduler()
                    await stop_subscription_scheduler()

        mock_generate.assert_awaited_once_with(date(2026, 8, 13))


def test_missed_startup_runs_today_once():
    asyncio.run(_run_missed_startup_test())


if __name__ == "__main__":
    test_parse_generation_time_default()
    test_parse_generation_time_custom()
    test_is_past_todays_generation()
    test_next_scheduled_run_before_today()
    test_next_scheduled_run_after_today()
    test_missed_startup_runs_today_once()
    print("ALL STEP 3B UNIT TESTS PASSED")
