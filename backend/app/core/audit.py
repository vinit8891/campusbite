"""Admin audit logging — safe metadata only (no secrets)."""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.logging import get_logger
from app.db.database import database

logger = get_logger(__name__)

audit_collection = database["admin_audit_logs"]


async def log_admin_action(
    *,
    admin_email: str,
    action: str,
    resource: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Persist an admin audit record.

  Never pass passwords, JWTs, Razorpay secrets, or webhook signatures.
    """
    email = (admin_email or "").strip().lower()
    if not email:
        logger.warning("audit skipped: missing admin_email action=%s", action)
        return

    doc = {
        "timestamp": datetime.now(UTC),
        "admin_email": email,
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
    }
    if metadata:
        safe_meta = {
            k: v
            for k, v in metadata.items()
            if k not in {"password", "token", "access_token", "secret", "signature"}
        }
        if safe_meta:
            doc["metadata"] = safe_meta

    try:
        await audit_collection.insert_one(doc)
        logger.info(
            "audit action=%s resource=%s resource_id=%s admin=%s",
            action,
            resource,
            resource_id,
            email,
        )
    except Exception:
        logger.exception(
            "audit write failed action=%s resource=%s resource_id=%s",
            action,
            resource,
            resource_id,
        )
