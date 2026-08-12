"""Persist notification delivery metadata (no message bodies)."""

from __future__ import annotations

from datetime import UTC, datetime

from app.db.database import database

notification_logs_collection = database["notification_logs"]

STATUS_SENT = "sent"
STATUS_FAILED = "failed"
STATUS_MOCKED = "mocked"


async def log_notification(
    *,
    recipient: str,
    notification_type: str,
    provider: str,
    status: str,
) -> None:
    await notification_logs_collection.insert_one(
        {
            "recipient": recipient,
            "type": notification_type,
            "provider": provider,
            "status": status,
            "created_at": datetime.now(UTC),
        }
    )
