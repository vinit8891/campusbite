"""Low-level Razorpay API + signature helpers (test mode / mock only)."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import httpx

from app.payments.config import (
    PaymentConfigError,
    is_razorpay_mock_mode,
    require_razorpay_credentials,
    require_webhook_secret,
)

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    key_secret: str | None = None,
) -> bool:
    """Verify checkout success signature (HMAC SHA256)."""
    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        return False

    if key_secret is None:
        _, key_secret = require_razorpay_credentials()

    payload = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(
        key_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)


def verify_webhook_signature(
    body: bytes,
    signature: str | None,
    secret: str | None = None,
) -> bool:
    if not signature:
        return False
    webhook_secret = secret or require_webhook_secret()
    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _mock_create_order(
    amount_paise: int,
    receipt: str,
    currency: str,
    notes: dict[str, Any] | None,
) -> dict:
    # Deterministic mock id for idempotent local testing
    digest = hashlib.sha256(
        f"{receipt}:{amount_paise}:{currency}".encode("utf-8")
    ).hexdigest()[:14]
    return {
        "id": f"order_mock_{digest}",
        "entity": "order",
        "amount": amount_paise,
        "amount_paid": 0,
        "amount_due": amount_paise,
        "currency": currency,
        "receipt": receipt,
        "status": "created",
        "notes": notes or {},
    }


async def create_razorpay_order(
    *,
    amount_paise: int,
    receipt: str,
    currency: str = "INR",
    notes: dict[str, Any] | None = None,
) -> dict:
    if amount_paise <= 0:
        raise PaymentConfigError("Amount must be greater than zero.")

    key_id, key_secret = require_razorpay_credentials()

    if is_razorpay_mock_mode():
        return _mock_create_order(amount_paise, receipt, currency, notes)

    payload = {
        "amount": amount_paise,
        "currency": currency,
        "receipt": receipt[:40],
        "payment_capture": 1,
        "notes": notes or {},
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{RAZORPAY_API_BASE}/orders",
            json=payload,
            auth=(key_id, key_secret),
        )

    if response.status_code >= 400:
        detail = response.text[:300]
        raise PaymentConfigError(
            f"Razorpay order creation failed ({response.status_code}): {detail}"
        )

    return response.json()


async def create_razorpay_refund(
    *,
    razorpay_payment_id: str,
    amount_paise: int,
    notes: dict[str, Any] | None = None,
) -> dict:
    """
    Execute a Razorpay TEST refund.
    POST /v1/payments/{payment_id}/refund
    Requires RAZORPAY_MOCK=0 and rzp_test_* credentials.
    """
    if is_razorpay_mock_mode():
        raise PaymentConfigError(
            "Razorpay refunds require RAZORPAY_MOCK=0 and real test credentials. "
            "Mock mode cannot issue refunds."
        )

    payment_id = (razorpay_payment_id or "").strip()
    if not payment_id:
        raise PaymentConfigError("razorpay_payment_id is required for refunds.")

    if int(amount_paise) <= 0:
        raise PaymentConfigError("Refund amount must be greater than zero.")

    key_id, key_secret = require_razorpay_credentials()

    payload: dict[str, Any] = {"amount": int(amount_paise)}
    if notes:
        payload["notes"] = notes

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{RAZORPAY_API_BASE}/payments/{payment_id}/refund",
            json=payload,
            auth=(key_id, key_secret),
        )

    if response.status_code >= 400:
        detail = response.text[:300]
        raise PaymentConfigError(
            f"Razorpay refund failed ({response.status_code}): {detail}"
        )

    return response.json()


def build_mock_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
) -> str:
    """Helper for tests — uses configured secret."""
    _, key_secret = require_razorpay_credentials()
    payload = f"{razorpay_order_id}|{razorpay_payment_id}"
    return hmac.new(
        key_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def parse_webhook_event(body: bytes) -> dict:
    return json.loads(body.decode("utf-8"))
