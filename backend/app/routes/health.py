"""Operational health and metrics endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Response

from datetime import datetime, timezone
import os
import time

from app.core.config import app_name, app_version, environment, settings
from app.core.env import ALWAYS_REQUIRED, is_environment_ready
from app.core.metrics import snapshot as metrics_snapshot
from app.core.metrics import uptime_seconds
from app.core.rate_limit import active_rate_limit_entries
from app.db.database import ping_database
from app.models.system import get_system_settings
from app.payments.config import is_razorpay_mock_mode

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """
    Production Health & Diagnostics Endpoint.
    - Pings MongoDB and measures round-trip latency in milliseconds.
    - Inspects Razorpay payment gateway credentials and operating mode.
    - Checks sitewide platform emergency kill-switch status.
    """
    t0 = time.perf_counter()
    db_ok = await ping_database()
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Razorpay payment gateway verification
    key_id = (
        getattr(settings, "RAZORPAY_KEY_ID", "")
        or os.getenv("RAZORPAY_KEY_ID", "")
    ).strip()
    key_secret = (
        getattr(settings, "RAZORPAY_KEY_SECRET", "")
        or os.getenv("RAZORPAY_KEY_SECRET", "")
    ).strip()

    is_mock = is_razorpay_mock_mode() or "test" in key_id.lower() or not key_id
    if key_id.startswith("rzp_live"):
        mode = "live"
    elif is_mock or key_id.startswith("rzp_test"):
        mode = "test"
    else:
        mode = "test" if key_id else "unconfigured"

    configured = bool(key_id and key_secret) or is_mock

    # Global platform status
    try:
        sys_config = await get_system_settings()
        is_platform_active = bool(sys_config.get("is_platform_active", True))
    except Exception:
        is_platform_active = True

    status_str = "healthy" if (db_ok and is_platform_active) else ("degraded" if db_ok else "unhealthy")

    return {
        "status": status_str,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": "connected" if db_ok else "disconnected",
            "latency_ms": latency_ms if db_ok else -1.0,
        },
        "payment_gateway": {
            "provider": "razorpay",
            "mode": mode,
            "configured": configured,
        },
        "platform": {
            "is_platform_active": is_platform_active,
        },
        "app_name": app_name(),
        "version": app_version(),
        "environment": environment(),
        "uptime": round(uptime_seconds(), 2),
    }



@router.get("/health/ready")
async def readiness_check(response: Response):
    """Readiness probe — required config present and MongoDB reachable."""
    env_ok, env_missing = is_environment_ready()
    db_ok = await ping_database()

    if not env_ok or not db_ok:
        response.status_code = 503
        return {
            "status": "not_ready",
            "app_name": app_name(),
            "environment": environment(),
            "database": "connected" if db_ok else "disconnected",
            "environment_loaded": env_ok,
            "missing_env": env_missing,
            "required_env": list(ALWAYS_REQUIRED) + ["SECRET_KEY (or JWT_SECRET)"],
            "version": app_version(),
            "uptime": round(uptime_seconds(), 2),
        }

    return {
        "status": "ready",
        "app_name": app_name(),
        "environment": environment(),
        "database": "connected",
        "environment_loaded": True,
        "version": app_version(),
        "uptime": round(uptime_seconds(), 2),
    }


@router.get("/metrics")
async def metrics():
    """Simple JSON metrics for operators (no Prometheus)."""
    return metrics_snapshot(
        active_rate_limit_entries=active_rate_limit_entries(),
    )
