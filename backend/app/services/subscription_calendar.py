from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta

WEEKDAY_NAMES = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]


def _weekday_name(value: date) -> str:
    return WEEKDAY_NAMES[value.weekday()]


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def _date_range(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _is_paused_on(subscription: dict, day: date) -> bool:
    if subscription.get("status") == "paused":
        pause_from = _parse_iso_date(subscription.get("pause_from"))
        pause_to = _parse_iso_date(subscription.get("pause_to"))
        if pause_from and pause_to and pause_from <= day <= pause_to:
            return True
        return True
    pause_from = _parse_iso_date(subscription.get("pause_from"))
    pause_to = _parse_iso_date(subscription.get("pause_to"))
    if pause_from and pause_to and pause_from <= day <= pause_to:
        return True
    return False


def is_subscription_scheduled_for_date(subscription: dict, target: date) -> bool:
    status = subscription.get("status")
    if status in {"cancelled", "expired", "paused"}:
        return False

    start = _subscription_start_date(subscription)
    end = _subscription_end_date(subscription)
    if not start or not end or target < start or target > end:
        return False

    delivery_days = {
        day.lower()
        for day in (subscription.get("delivery_days") or [])
        if isinstance(day, str)
    }
    if _weekday_name(target) not in delivery_days:
        return False

    skipped = {
        value[:10]
        for value in (subscription.get("skipped_dates") or [])
        if value
    }
    if target.isoformat() in skipped:
        return False

    if _is_paused_on(subscription, target):
        return False

    return True


def count_subscription_meals(subscription: dict) -> int:
    start = _subscription_start_date(subscription)
    end = _subscription_end_date(subscription)
    if not start or not end:
        return 1

    delivery_days = {
        day.lower()
        for day in (subscription.get("delivery_days") or [])
        if isinstance(day, str)
    }
    skipped = {
        value[:10]
        for value in (subscription.get("skipped_dates") or [])
        if value
    }

    total = 0
    for day in _date_range(start, end):
        if _weekday_name(day) not in delivery_days:
            continue
        if day.isoformat() in skipped:
            continue
        total += 1
    return max(total, 1)


def _subscription_end_date(subscription: dict) -> date | None:
    return _parse_iso_date(subscription.get("end_date"))


def _subscription_start_date(subscription: dict) -> date | None:
    return _parse_iso_date(subscription.get("start_date"))


def _meal_entry(subscription: dict, day: date, *, kind: str) -> dict:
    return {
        "date": day.isoformat(),
        "kind": kind,
        "subscription_id": subscription.get("subscription_id"),
        "plan_id": subscription.get("plan_id"),
        "restaurant_email": subscription.get("restaurant_email"),
        "meal_type": subscription.get("meal_type"),
        "start_time": subscription.get("start_time"),
        "end_time": subscription.get("end_time"),
        "plan_name": subscription.get("plan_name"),
    }


def build_subscription_calendar(
    subscriptions: list[dict],
    *,
    today: date | None = None,
    month: str | None = None,
) -> dict:
    today = today or date.today()

    if month:
        year, month_num = [int(part) for part in month.split("-", 1)]
        range_start = date(year, month_num, 1)
        range_end = date(year, month_num, monthrange(year, month_num)[1])
    else:
        range_start = today
        range_end = today + timedelta(days=30)

    today_meals: list[dict] = []
    upcoming_meals: list[dict] = []
    skipped_dates: list[str] = []
    paused_dates: list[str] = []

    skipped_set: set[str] = set()
    paused_set: set[str] = set()

    for subscription in subscriptions:
        status = subscription.get("status")
        if status in {"cancelled", "expired"}:
            continue

        start = _subscription_start_date(subscription)
        end = _subscription_end_date(subscription)
        if not start or not end:
            continue

        delivery_days = {
            day.lower()
            for day in (subscription.get("delivery_days") or [])
            if isinstance(day, str)
        }
        skipped = {
            value[:10]
            for value in (subscription.get("skipped_dates") or [])
            if value
        }
        skipped_set.update(skipped)

        pause_from = _parse_iso_date(subscription.get("pause_from"))
        pause_to = _parse_iso_date(subscription.get("pause_to"))
        if pause_from and pause_to:
            for day in _date_range(pause_from, pause_to):
                paused_set.add(day.isoformat())

        scan_start = max(start, range_start)
        scan_end = min(end, range_end)
        if scan_start > scan_end:
            continue

        for day in _date_range(scan_start, scan_end):
            iso_day = day.isoformat()
            if _weekday_name(day) not in delivery_days:
                continue

            if iso_day in skipped:
                continue

            if _is_paused_on(subscription, day):
                continue

            entry = _meal_entry(subscription, day, kind="meal")
            if day == today:
                today_meals.append(entry)
            elif day > today:
                upcoming_meals.append(entry)

    skipped_dates = sorted(skipped_set)
    paused_dates = sorted(paused_set)

    today_meals.sort(key=lambda item: item["date"])
    upcoming_meals.sort(key=lambda item: item["date"])

    return {
        "today_meals": today_meals,
        "upcoming_meals": upcoming_meals,
        "skipped_dates": skipped_dates,
        "paused_dates": paused_dates,
        "range_start": range_start.isoformat(),
        "range_end": range_end.isoformat(),
    }
