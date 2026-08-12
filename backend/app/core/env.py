"""Startup environment validation (fail fast on missing config)."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from app.core.logging import get_logger

logger = get_logger(__name__)

# Always required for API boot
ALWAYS_REQUIRED = (
    "MONGODB_URL",
    "DATABASE_NAME",
)


class EnvironmentValidationError(RuntimeError):
    """Raised when required environment variables are missing."""


def _is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _resolve_secret_key() -> None:
    """
    Prefer SECRET_KEY; accept JWT_SECRET as an alias for compatibility.
    Does not log secret values.
    """
    secret = (os.getenv("SECRET_KEY") or "").strip()
    jwt_secret = (os.getenv("JWT_SECRET") or "").strip()

    if not secret and jwt_secret:
        os.environ["SECRET_KEY"] = jwt_secret


def validate_environment() -> None:
    """
    Validate required environment variables during startup.

    Missing required variables fail fast with a clear message.
    Never logs secret values.
    """
    load_dotenv()
    _resolve_secret_key()

    missing: list[str] = []

    for name in ALWAYS_REQUIRED:
        if not (os.getenv(name) or "").strip():
            missing.append(name)

    if not (os.getenv("SECRET_KEY") or "").strip():
        missing.append("SECRET_KEY (or JWT_SECRET)")

    # Razorpay credentials required unless explicit mock mode
    razorpay_mock = _is_truthy(os.getenv("RAZORPAY_MOCK"))
    key_id = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    key_secret = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()

    if not razorpay_mock:
        # Allow legacy implicit mock when key id is the mock placeholder
        if key_id.startswith("rzp_test_mock"):
            razorpay_mock = True

    if not razorpay_mock:
        if not key_id:
            missing.append("RAZORPAY_KEY_ID")
        if not key_secret:
            missing.append("RAZORPAY_KEY_SECRET")

    if missing:
        joined = ", ".join(missing)
        message = (
            "Missing required environment variables: "
            f"{joined}. Set them in backend/.env and restart."
        )
        logger.error("Environment validation failed: %s", joined)
        raise EnvironmentValidationError(message)

    logger.info(
        "Environment validation passed (razorpay_mode=%s)",
        "mock" if razorpay_mock or key_id.startswith("rzp_test_mock") else "configured",
    )
