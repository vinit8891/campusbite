"""Operational health and metrics endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Response

from app.core.config import app_name, app_version, environment
from app.core.env import ALWAYS_REQUIRED, is_environment_ready
from app.core.metrics import snapshot as metrics_snapshot
from app.core.metrics import uptime_seconds
from app.core.rate_limit import active_rate_limit_entries
from app.db.database import ping_database

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Liveness probe — process is up and MongoDB responds."""
    db_ok = await ping_database()
    return {
        "status": "ok" if db_ok else "degraded",
        "app_name": app_name(),
        "environment": environment(),
        "database": "connected" if db_ok else "disconnected",
        "version": app_version(),
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
