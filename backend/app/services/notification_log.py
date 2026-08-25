"""Persist notification delivery metadata (no message bodies)."""

from __future__ import annotations

from datetime import UTC, datetime

from typing import Any

from app.core.logging import get_logger
from app.db.database import database

logger = get_logger(__name__)

notification_logs_collection = database["notification_logs"]

STATUS_SENT = "sent"
STATUS_FAILED = "failed"
STATUS_MOCKED = "mocked"


async def log_notification(
    recipient: str | None = None,
    notification_type: str | None = None,
    provider: str | None = None,
    status: str | None = None,
    customer_id: str | None = None,
    user_id: str | None = None,
    recipient_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    **kwargs: Any,
) -> None:
    """Log notification delivery metadata to MongoDB notification_logs.

    Accepts flexible keyword parameters including customer_id, user_id,
    recipient_id, metadata, and arbitrary kwargs without raising TypeError.
    """
    try:
        resolved_recipient = (
            recipient
            or kwargs.pop("recipient_email", None)
            or kwargs.pop("email", None)
            or "unknown"
        )
        resolved_type = (
            notification_type
            or kwargs.pop("type", None)
            or "unknown"
        )
        resolved_provider = provider or kwargs.pop("provider_name", None) or "unknown"
        resolved_status = status or STATUS_SENT

        resolved_customer_id = (
            customer_id
            or user_id
            or recipient_id
            or kwargs.pop("id", None)
        )

        doc: dict[str, Any] = {
            "recipient": resolved_recipient,
            "type": resolved_type,
            "provider": resolved_provider,
            "status": resolved_status,
            "created_at": datetime.now(UTC),
        }

        if resolved_customer_id is not None:
            doc["customer_id"] = str(resolved_customer_id)
        if user_id is not None:
            doc["user_id"] = str(user_id)
        if recipient_id is not None:
            doc["recipient_id"] = str(recipient_id)

        meta: dict[str, Any] = dict(metadata or {})
        for k, v in kwargs.items():
            if k not in doc:
                doc[k] = v
            else:
                meta[k] = v
        if meta:
            doc["metadata"] = meta

        await notification_logs_collection.insert_one(doc)
    except Exception as exc:
        logger.exception("Failed to persist notification audit log: %s", exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass

