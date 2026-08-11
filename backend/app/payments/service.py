"""Payment domain service — create, verify, webhook, refund scaffolding."""

from __future__ import annotations

from datetime import datetime, UTC

from fastapi import HTTPException

from app.models.order import get_order_by_id
from app.models.payment import (
    claim_webhook_event,
    create_payment_attempt,
    create_refund_record,
    get_payment_by_idempotency_key,
    get_payment_by_order_id,
    get_payment_by_razorpay_order_id,
    get_refund_by_id,
    get_refund_by_idempotency_key,
    list_refunds_for_order,
    mark_order_paid_once,
    update_order_payment_fields,
    update_payment_attempt,
    update_refund_record,
)
from app.payments.amounts import (
    assert_client_total_matches,
    calculate_payable_amount,
    from_paise,
    to_paise,
)
from app.payments.config import (
    PaymentConfigError,
    get_razorpay_key_id,
    is_razorpay_mock_mode,
    public_razorpay_config,
)
from app.payments.constants import (
    PAYMENT_METHOD_ONLINE,
    PAYMENT_STATUS_CANCELLED,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_PARTIALLY_REFUNDED,
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_PROCESSING,
    PAYMENT_STATUS_REFUNDED,
    PROVIDER_RAZORPAY,
)
from app.payments.razorpay_client import (
    build_mock_signature,
    create_razorpay_order,
    create_razorpay_refund,
    parse_webhook_event,
    verify_payment_signature,
    verify_webhook_signature,
)
from app.payments.transitions import assert_can_transition


def _customer_owns(order: dict, user: dict) -> bool:
    customer_id = user.get("sub")
    if (
        customer_id
        and order.get("customer_id")
        and str(order.get("customer_id")) == str(customer_id)
    ):
        return True
    token_email = user.get("email")
    if (
        token_email
        and order.get("customer_email")
        and str(token_email).lower()
        == str(order.get("customer_email")).lower()
    ):
        return True
    token_phone = user.get("phone")
    if token_phone and str(token_phone) == str(order.get("phone")):
        return True
    return False


def assert_customer_owns_order(order: dict, user: dict) -> None:
    if not _customer_owns(order, user):
        raise HTTPException(
            status_code=403,
            detail="You can only pay for your own orders",
        )


def trusted_order_amount_paise(order: dict) -> int:
    """Authoritative payable amount from stored items (not client total)."""
    if order.get("amount_paise") is not None:
        try:
            stored = int(order["amount_paise"])
            if stored > 0:
                return stored
        except (TypeError, ValueError):
            pass

    items = order.get("items") or []
    rupees = calculate_payable_amount(items)
    return to_paise(rupees)


async def create_online_payment_for_order(
    *,
    order_id: str,
    user: dict,
    client_amount: float | None = None,
) -> dict:
    order = await get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    assert_customer_owns_order(order, user)

    if order.get("payment_method") != PAYMENT_METHOD_ONLINE:
        raise HTTPException(
            status_code=400,
            detail="Online payment is only available for online orders.",
        )

    current_status = order.get("payment_status") or PAYMENT_STATUS_PENDING
    if current_status == PAYMENT_STATUS_PAID:
        raise HTTPException(
            status_code=400,
            detail="Order is already paid.",
        )
    if current_status in {
        PAYMENT_STATUS_REFUNDED,
        PAYMENT_STATUS_PARTIALLY_REFUNDED,
    }:
        raise HTTPException(
            status_code=400,
            detail="Refunded orders cannot start a new payment.",
        )

    amount_paise = trusted_order_amount_paise(order)
    assert_client_total_matches(
        client_amount,
        from_paise(amount_paise),
    )

    idempotency_key = f"rzp_create:{order_id}:{amount_paise}"
    existing = await get_payment_by_idempotency_key(idempotency_key)
    if not existing:
        existing = await get_payment_by_order_id(order_id)

    if existing and existing.get("razorpay_order_id"):
        if existing.get("status") in {
            PAYMENT_STATUS_PROCESSING,
            PAYMENT_STATUS_PENDING,
        }:
            # Idempotent replay — return the same Razorpay order
            if int(existing.get("amount_paise") or 0) != amount_paise:
                raise HTTPException(
                    status_code=409,
                    detail="Existing payment amount does not match order total.",
                )
            return {
                "order_id": order_id,
                "payment_id": existing.get("_id"),
                "razorpay_order_id": existing["razorpay_order_id"],
                "amount": from_paise(amount_paise),
                "amount_paise": amount_paise,
                "currency": "INR",
                "key_id": get_razorpay_key_id(),
                "payment_status": order.get("payment_status"),
                "idempotent": True,
            }

    if current_status not in {
        PAYMENT_STATUS_PENDING,
        PAYMENT_STATUS_FAILED,
        PAYMENT_STATUS_CANCELLED,
        PAYMENT_STATUS_PROCESSING,
    }:
        assert_can_transition(current_status, PAYMENT_STATUS_PROCESSING)

    receipt = f"cb_{order_id}"[-40:]

    try:
        rz_order = await create_razorpay_order(
            amount_paise=amount_paise,
            receipt=receipt,
            notes={
                "campusbite_order_id": order_id,
                "customer_id": str(order.get("customer_id") or ""),
            },
        )
    except PaymentConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    razorpay_order_id = rz_order.get("id")
    if not razorpay_order_id:
        raise HTTPException(
            status_code=502,
            detail="Razorpay did not return an order id.",
        )

    if int(rz_order.get("amount") or 0) != amount_paise:
        raise HTTPException(
            status_code=502,
            detail="Razorpay amount does not match CampusBite order amount.",
        )

    payment_doc = {
        "order_id": order_id,
        "customer_id": str(order.get("customer_id") or user.get("sub")),
        "provider": PROVIDER_RAZORPAY,
        "amount_paise": amount_paise,
        "currency": "INR",
        "status": PAYMENT_STATUS_PROCESSING,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": None,
        "razorpay_signature": None,
        "idempotency_key": idempotency_key,
        "receipt": receipt,
    }

    prior = await get_payment_by_idempotency_key(idempotency_key)
    if prior:
        payment_id = prior["_id"]
        await update_payment_attempt(payment_id, payment_doc)
    else:
        payment_id = await create_payment_attempt(payment_doc)

    await update_order_payment_fields(
        order_id,
        {
            "payment_method": PAYMENT_METHOD_ONLINE,
            "payment_status": PAYMENT_STATUS_PROCESSING,
            "amount_paise": amount_paise,
            "total": from_paise(amount_paise),
            "razorpay_order_id": razorpay_order_id,
        },
    )

    return {
        "order_id": order_id,
        "payment_id": payment_id,
        "razorpay_order_id": razorpay_order_id,
        "amount": from_paise(amount_paise),
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": get_razorpay_key_id(),
        "payment_status": PAYMENT_STATUS_PROCESSING,
        "idempotent": False,
    }


async def verify_online_payment(
    *,
    order_id: str,
    user: dict,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> dict:
    order = await get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    assert_customer_owns_order(order, user)

    if order.get("payment_method") != PAYMENT_METHOD_ONLINE:
        raise HTTPException(
            status_code=400,
            detail="Not an online payment order.",
        )

    # Idempotent success if already paid with same payment id
    if order.get("payment_status") == PAYMENT_STATUS_PAID:
        if (
            order.get("razorpay_payment_id")
            and order.get("razorpay_payment_id") != razorpay_payment_id
        ):
            raise HTTPException(
                status_code=409,
                detail="Order already paid with a different payment id.",
            )
        return {
            "success": True,
            "order_id": order_id,
            "payment_status": PAYMENT_STATUS_PAID,
            "idempotent": True,
        }

    amount_paise = trusted_order_amount_paise(order)

    stored_rz_order = order.get("razorpay_order_id")
    if stored_rz_order and stored_rz_order != razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="razorpay_order_id does not match this CampusBite order.",
        )

    try:
        valid = verify_payment_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        )
    except PaymentConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not valid:
        await update_order_payment_fields(
            order_id,
            {"payment_status": PAYMENT_STATUS_FAILED},
        )
        payment = await get_payment_by_order_id(order_id)
        if payment:
            await update_payment_attempt(
                payment["_id"],
                {"status": PAYMENT_STATUS_FAILED},
            )
        raise HTTPException(
            status_code=400,
            detail="Invalid payment signature.",
        )

    changed, updated = await mark_order_paid_once(
        order_id,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature,
        amount_paise=amount_paise,
    )

    payment = await get_payment_by_razorpay_order_id(razorpay_order_id)
    if payment:
        await update_payment_attempt(
            payment["_id"],
            {
                "status": PAYMENT_STATUS_PAID,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
                "paid_at": datetime.now(UTC),
            },
        )

    return {
        "success": True,
        "order_id": order_id,
        "payment_status": PAYMENT_STATUS_PAID,
        "razorpay_payment_id": razorpay_payment_id,
        "idempotent": not changed,
        "order_status": (updated or order).get("status"),
    }


async def cancel_online_payment(
    *,
    order_id: str,
    user: dict,
    reason: str | None = None,
) -> dict:
    """User closed checkout / abandoned payment — does not change order status."""
    order = await get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assert_customer_owns_order(order, user)

    if order.get("payment_method") != PAYMENT_METHOD_ONLINE:
        raise HTTPException(status_code=400, detail="Not an online order.")

    status = order.get("payment_status") or PAYMENT_STATUS_PENDING
    if status == PAYMENT_STATUS_PAID:
        raise HTTPException(
            status_code=400,
            detail="Paid orders cannot be cancelled via payment cancel.",
        )

    reason_l = (reason or "").lower()
    target = (
        PAYMENT_STATUS_FAILED
        if "payment_failed" in reason_l or reason_l == "failed"
        else PAYMENT_STATUS_CANCELLED
    )
    assert_can_transition(status, target)
    await update_order_payment_fields(
        order_id,
        {
            "payment_status": target,
            "payment_cancel_reason": reason or "user_cancelled",
        },
    )
    payment = await get_payment_by_order_id(order_id)
    if payment and payment.get("status") != PAYMENT_STATUS_PAID:
        await update_payment_attempt(
            payment["_id"],
            {"status": target},
        )

    return {
        "success": True,
        "order_id": order_id,
        "payment_status": target,
    }


async def mock_complete_checkout(
    *,
    order_id: str,
    user: dict,
    outcome: str,
) -> dict:
    """
    Simulate Razorpay Checkout in RAZORPAY_MOCK mode only.
    Generates signature server-side so the browser never needs secrets.
    """
    if not is_razorpay_mock_mode():
        raise HTTPException(
            status_code=403,
            detail=(
                "Mock checkout is only available when RAZORPAY_MOCK=1. "
                "Use real Razorpay Test Checkout with rzp_test_* keys."
            ),
        )

    normalized = (outcome or "").strip().lower()
    if normalized not in {"success", "failure", "dismiss"}:
        raise HTTPException(
            status_code=400,
            detail="outcome must be success, failure, or dismiss",
        )

    if normalized == "dismiss":
        result = await cancel_online_payment(
            order_id=order_id,
            user=user,
            reason="mock_checkout_dismissed",
        )
        return {**result, "outcome": "dismiss", "mock": True}

    order = await get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    assert_customer_owns_order(order, user)

    if order.get("payment_method") != PAYMENT_METHOD_ONLINE:
        raise HTTPException(
            status_code=400,
            detail="Mock checkout is only for online orders.",
        )

    if order.get("payment_status") == PAYMENT_STATUS_PAID:
        return {
            "success": True,
            "order_id": order_id,
            "payment_status": PAYMENT_STATUS_PAID,
            "idempotent": True,
            "outcome": "success",
            "mock": True,
        }

    razorpay_order_id = order.get("razorpay_order_id")
    if not razorpay_order_id:
        payment = await get_payment_by_order_id(order_id)
        razorpay_order_id = (payment or {}).get("razorpay_order_id")

    if not razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="Create a Razorpay payment before completing mock checkout.",
        )

    if normalized == "failure":
        await update_order_payment_fields(
            order_id,
            {"payment_status": PAYMENT_STATUS_FAILED},
        )
        payment = await get_payment_by_order_id(order_id)
        if payment:
            await update_payment_attempt(
                payment["_id"],
                {"status": PAYMENT_STATUS_FAILED},
            )
        return {
            "success": False,
            "order_id": order_id,
            "payment_status": PAYMENT_STATUS_FAILED,
            "outcome": "failure",
            "mock": True,
        }

    payment_id = f"pay_mock_{order_id[-8:]}"
    signature = build_mock_signature(razorpay_order_id, payment_id)
    verified = await verify_online_payment(
        order_id=order_id,
        user=user,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
    )
    return {**verified, "outcome": "success", "mock": True}


async def process_razorpay_webhook(
    *,
    body: bytes,
    signature: str | None,
) -> dict:
    """
    Verifies Razorpay webhook signature and applies paid/failed idempotently.
    Handles payment.captured arriving before or after frontend verify.
    Does not trust any frontend payment status.
    """
    if not signature:
        raise HTTPException(
            status_code=400,
            detail="Missing X-Razorpay-Signature header.",
        )

    try:
        if not verify_webhook_signature(body, signature):
            raise HTTPException(
                status_code=400,
                detail="Invalid webhook signature.",
            )
    except PaymentConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        event = parse_webhook_event(body)
    except (UnicodeDecodeError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid webhook JSON body.",
        ) from exc

    event_name = str(event.get("event") or "")
    # Razorpay provides a unique event id; fall back to a stable composite
    event_id = str(event.get("id") or "").strip()
    if not event_id:
        payment_entity_tmp = (
            ((event.get("payload") or {}).get("payment") or {}).get("entity")
        ) or {}
        event_id = (
            f"{event_name}:"
            f"{payment_entity_tmp.get('id') or ''}:"
            f"{payment_entity_tmp.get('order_id') or ''}"
        ).strip(":")

    first_seen = await claim_webhook_event(event_id, event_name)
    if not first_seen:
        return {
            "handled": True,
            "idempotent": True,
            "duplicate": True,
            "event": event_name,
            "event_id": event_id,
        }

    payload = event.get("payload") or {}
    payment_entity = ((payload.get("payment") or {}).get("entity")) or {}
    order_entity = ((payload.get("order") or {}).get("entity")) or {}

    razorpay_payment_id = payment_entity.get("id")
    razorpay_order_id = payment_entity.get("order_id") or order_entity.get("id")
    amount_paise = payment_entity.get("amount")

    payment = None
    if razorpay_order_id:
        payment = await get_payment_by_razorpay_order_id(razorpay_order_id)

    order_id = None
    if payment:
        order_id = payment.get("order_id")
    notes = payment_entity.get("notes") or order_entity.get("notes") or {}
    if not order_id:
        order_id = notes.get("campusbite_order_id")

    if event_name in {"payment.captured", "order.paid"} and order_id:
        order = await get_order_by_id(order_id)
        if not order:
            return {
                "handled": False,
                "reason": "order_not_found",
                "event_id": event_id,
            }

        expected = trusted_order_amount_paise(order)
        if amount_paise is not None and int(amount_paise) != expected:
            return {
                "handled": False,
                "reason": "amount_mismatch",
                "expected_paise": expected,
                "got_paise": amount_paise,
                "event_id": event_id,
            }

        changed, _ = await mark_order_paid_once(
            order_id,
            razorpay_order_id=razorpay_order_id
            or order.get("razorpay_order_id"),
            razorpay_payment_id=razorpay_payment_id
            or order.get("razorpay_payment_id")
            or "",
            razorpay_signature=None,
            amount_paise=expected,
        )
        if payment:
            await update_payment_attempt(
                payment["_id"],
                {
                    "status": PAYMENT_STATUS_PAID,
                    "razorpay_payment_id": razorpay_payment_id,
                    "webhook_event": event_name,
                    "webhook_event_id": event_id,
                },
            )
        return {
            "handled": True,
            "order_id": order_id,
            "payment_status": PAYMENT_STATUS_PAID,
            "idempotent": not changed,
            "event_id": event_id,
        }

    if event_name in {"payment.failed"} and order_id:
        order = await get_order_by_id(order_id)
        already_paid = bool(
            order and order.get("payment_status") == PAYMENT_STATUS_PAID
        )
        if order and not already_paid:
            await update_order_payment_fields(
                order_id,
                {"payment_status": PAYMENT_STATUS_FAILED},
            )
            if payment:
                await update_payment_attempt(
                    payment["_id"],
                    {
                        "status": PAYMENT_STATUS_FAILED,
                        "webhook_event": event_name,
                        "webhook_event_id": event_id,
                    },
                )
        return {
            "handled": True,
            "order_id": order_id,
            "payment_status": (
                PAYMENT_STATUS_PAID if already_paid else PAYMENT_STATUS_FAILED
            ),
            "idempotent": already_paid,
            "event_id": event_id,
        }

    return {
        "handled": False,
        "event": event_name,
        "event_id": event_id,
    }


async def create_refund_request(
    *,
    order_id: str,
    amount_paise: int | None,
    reason: str | None,
    idempotency_key: str | None,
    actor: dict,
) -> dict:
    """
    Validate and execute a Razorpay TEST refund.
    Creates/reuses a local refund record, then calls Razorpay only after validation.
    """
    order = await get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("payment_method") != PAYMENT_METHOD_ONLINE:
        raise HTTPException(
            status_code=400,
            detail="Refunds apply only to online payments.",
        )

    paid_paise = trusted_order_amount_paise(order)

    if amount_paise is None:
        default_key = f"refund:{order_id}:full:{paid_paise}"
    else:
        default_key = f"refund:{order_id}:{int(amount_paise)}"

    key = idempotency_key or default_key
    prior = await get_refund_by_idempotency_key(key)

    # Idempotent success — never create a second Razorpay refund
    if prior and prior.get("executed") and prior.get("refund_id"):
        return {
            "refund": prior,
            "idempotent": True,
            "executed": True,
            "message": "Refund already executed (idempotent).",
        }

    if order.get("payment_status") not in {
        PAYMENT_STATUS_PAID,
        PAYMENT_STATUS_PARTIALLY_REFUNDED,
    }:
        raise HTTPException(
            status_code=400,
            detail="Only paid orders can be refunded.",
        )

    razorpay_payment_id = (order.get("razorpay_payment_id") or "").strip()
    if not razorpay_payment_id:
        raise HTTPException(
            status_code=400,
            detail="Order is missing razorpay_payment_id; cannot refund.",
        )

    existing_refunds = await list_refunds_for_order(order_id)

    def _counts_toward_refunded(row: dict) -> bool:
        # Only successful or in-flight refunds reduce remaining balance.
        if row.get("executed") is True:
            return True
        return row.get("status") in {"processed", "processing"}

    already_refunded = sum(
        int(r.get("amount_paise") or 0)
        for r in existing_refunds
        if _counts_toward_refunded(r)
    )
    remaining = paid_paise - already_refunded

    if amount_paise is None:
        refund_amount = remaining if remaining > 0 else paid_paise
    else:
        refund_amount = int(amount_paise)

    # Reuse a prior failed/pending record for retry; otherwise allocate remaining
    local_refund_id = prior.get("_id") if prior else None

    if not prior:
        if remaining <= 0:
            raise HTTPException(status_code=400, detail="Order is fully refunded.")

        if refund_amount <= 0 or refund_amount > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Refund amount must be between 1 and {remaining} paise.",
            )

        local_refund_id = await create_refund_record(
            {
                "order_id": order_id,
                "provider": PROVIDER_RAZORPAY,
                "razorpay_payment_id": razorpay_payment_id,
                "refund_id": None,
                "amount_paise": refund_amount,
                "currency": "INR",
                "status": "processing",
                "reason": reason,
                "idempotency_key": key,
                "requested_by": {
                    "role": actor.get("role"),
                    "sub": actor.get("sub"),
                    "email": actor.get("email"),
                },
                "executed": False,
            }
        )
    else:
        # Retry path — amount locked to prior record
        refund_amount = int(prior.get("amount_paise") or refund_amount)
        await update_refund_record(
            local_refund_id,
            {
                "status": "processing",
                "razorpay_payment_id": razorpay_payment_id,
                "last_error": None,
            },
        )

    # Execute against Razorpay (TEST mode only; mock blocked in client)
    try:
        rz_refund = await create_razorpay_refund(
            razorpay_payment_id=razorpay_payment_id,
            amount_paise=refund_amount,
            notes={
                "campusbite_order_id": order_id,
                "campusbite_refund_id": str(local_refund_id),
                "reason": reason or "",
            },
        )
    except PaymentConfigError as exc:
        await update_refund_record(
            local_refund_id,
            {
                "status": "failed",
                "executed": False,
                "last_error": str(exc),
            },
        )
        # Do not mark order as refunded on provider failure
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    rz_refund_id = rz_refund.get("id")
    if not rz_refund_id:
        await update_refund_record(
            local_refund_id,
            {
                "status": "failed",
                "executed": False,
                "last_error": "Razorpay did not return a refund id.",
                "provider_response": rz_refund,
            },
        )
        raise HTTPException(
            status_code=502,
            detail="Razorpay did not return a refund id.",
        )

    now = datetime.now(UTC)
    await update_refund_record(
        local_refund_id,
        {
            "refund_id": rz_refund_id,
            "status": "processed",
            "executed": True,
            "processed_at": now,
            "provider_response": {
                "id": rz_refund_id,
                "amount": rz_refund.get("amount"),
                "status": rz_refund.get("status"),
                "payment_id": rz_refund.get("payment_id"),
            },
            "last_error": None,
        },
    )

    refreshed = await list_refunds_for_order(order_id)
    total_refunded = sum(
        int(r.get("amount_paise") or 0)
        for r in refreshed
        if r.get("executed") is True or r.get("status") == "processed"
    )

    new_status = (
        PAYMENT_STATUS_REFUNDED
        if total_refunded >= paid_paise
        else PAYMENT_STATUS_PARTIALLY_REFUNDED
    )
    await update_order_payment_fields(
        order_id,
        {
            "payment_status": new_status,
            "refund_id": rz_refund_id,
            "last_refund_at": now,
            "refunded_amount_paise": total_refunded,
        },
    )

    updated = await get_refund_by_id(local_refund_id)
    return {
        "refund": updated or {"_id": local_refund_id, "refund_id": rz_refund_id},
        "idempotent": False,
        "executed": True,
        "payment_status": new_status,
        "message": "Refund executed successfully via Razorpay test mode.",
    }


def get_public_config() -> dict:
    return public_razorpay_config()
