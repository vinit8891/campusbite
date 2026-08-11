"""Razorpay environment configuration (secrets never exposed to clients)."""

import os

from dotenv import load_dotenv

load_dotenv()

MOCK_KEY_ID = "rzp_test_mock_local"
MOCK_KEY_SECRET = "campusbite_mock_razorpay_secret"


class PaymentConfigError(Exception):
    """Raised when payment provider credentials or config are missing/invalid."""


def _env_flag(name: str) -> str:
    return (os.getenv(name) or "").strip().lower()


def is_razorpay_mock_mode() -> bool:
    """
    Mock mode for local verification without real Razorpay credentials.

    RAZORPAY_MOCK=0|false|off explicitly disables mock (required for real test mode).
    RAZORPAY_MOCK=1|true|on enables mock.
    If unset, mock is used only when KEY_ID starts with rzp_test_mock.
    """
    flag = _env_flag("RAZORPAY_MOCK")
    if flag in {"0", "false", "no", "off"}:
        return False
    if flag in {"1", "true", "yes", "on"}:
        return True
    key_id = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    return key_id.startswith("rzp_test_mock")


def get_razorpay_key_id() -> str | None:
    value = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    if value:
        return value
    if is_razorpay_mock_mode():
        return MOCK_KEY_ID
    return None


def get_razorpay_key_secret() -> str | None:
    value = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()
    if value:
        return value
    if is_razorpay_mock_mode():
        return MOCK_KEY_SECRET
    return None


def get_razorpay_webhook_secret() -> str | None:
    value = (os.getenv("RAZORPAY_WEBHOOK_SECRET") or "").strip()
    if value:
        return value
    if is_razorpay_mock_mode():
        return MOCK_KEY_SECRET
    return None


def require_razorpay_credentials() -> tuple[str, str]:
    if is_razorpay_mock_mode():
        return (
            get_razorpay_key_id() or MOCK_KEY_ID,
            get_razorpay_key_secret() or MOCK_KEY_SECRET,
        )

    key_id = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    key_secret = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()
    if not key_id or not key_secret:
        raise PaymentConfigError(
            "Razorpay test mode is not configured. Set RAZORPAY_KEY_ID and "
            "RAZORPAY_KEY_SECRET (rzp_test_* only), and RAZORPAY_MOCK=0."
        )
    if key_id.startswith("rzp_live_"):
        raise PaymentConfigError(
            "Production Razorpay keys are not allowed. Use test mode keys (rzp_test_*)."
        )
    if not key_id.startswith("rzp_test_"):
        raise PaymentConfigError(
            "Only Razorpay test keys (rzp_test_*) are allowed in this phase."
        )
    return key_id, key_secret


def require_webhook_secret() -> str:
    secret = get_razorpay_webhook_secret()
    if not secret:
        raise PaymentConfigError(
            "RAZORPAY_WEBHOOK_SECRET is not configured for Razorpay test mode."
        )
    return secret


def public_razorpay_config() -> dict:
    """Safe payload for clients — key id only, never secrets."""
    mock = is_razorpay_mock_mode()
    try:
        key_id, _ = require_razorpay_credentials()
        configured = True
    except PaymentConfigError:
        key_id = None
        configured = False

    webhook_ready = bool(get_razorpay_webhook_secret()) if configured else False

    return {
        "provider": "razorpay",
        "enabled": configured,
        "key_id": key_id if configured else None,
        "mode": "mock" if mock and configured else ("test" if configured else "disabled"),
        "mock_checkout_available": bool(mock and configured),
        "webhook_configured": webhook_ready,
        # Never include key_secret / webhook_secret
    }
