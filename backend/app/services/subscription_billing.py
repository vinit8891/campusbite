"""Subscription renewal billing via one-time Razorpay orders (production-hardened)."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from fastapi import BackgroundTasks, HTTPException

from app.db.transactions import run_optional_transaction
from app.models.subscription import (
    apply_subscription_renewal_once,
    get_subscription_by_id,
    subscription_matches_renewal,
    update_subscription,
)
from app.models.subscription_payment import (
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_PROCESSING,
    find_active_renewal_for_billing_period,
    find_incomplete_paid_renewal,
    find_pending_renewal_for_subscription,
    get_latest_paid_payment_for_subscription,
    get_payment_by_id,
    get_payment_by_razorpay_order_id,
    get_payment_by_razorpay_payment_id,
    get_payment_by_transaction_reference,
    insert_renewal_payment_if_absent,
    mark_subscription_payment_failed_once,
    mark_subscription_payment_paid_once,
    mark_subscription_payment_synced,
    update_subscription_payment,
)
from app.payments.amounts import from_paise, to_paise
from app.payments.config import PaymentConfigError, get_razorpay_key_id, is_razorpay_mock_mode
from app.payments.razorpay_client import (
    build_mock_signature,
    create_razorpay_order,
    verify_payment_signature,
)
from app.schemas.subscription import compute_subscription_end_date
from app.services.notification_service import (
    notify_subscription_payment_failed,
    notify_subscription_renewed,
    schedule_notification,
)

PAYMENT_METHOD_ONLINE = "online"


def _customer_owns_subscription(subscription: dict, user: dict) -> bool:
    token_email = (user.get("email") or "").strip().lower()
    customer_email = (subscription.get("customer_email") or "").strip().lower()
    return bool(token_email and customer_email and token_email == customer_email)


def assert_customer_owns_subscription(subscription: dict, user: dict) -> None:
    if not _customer_owns_subscription(subscription, user):
        raise HTTPException(
            status_code=403,
            detail="You can only manage your own subscriptions",
        )


def _subscription_amount_paise(subscription: dict) -> int:
    try:
        price = float(subscription.get("price") or 0)
    except (TypeError, ValueError):
        price = 0.0
    if price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Subscription price must be greater than zero.",
        )
    return to_paise(price)


def _is_expired(subscription: dict) -> bool:
    status = (subscription.get("status") or "").lower()
    if status == "expired":
        return True
    end_raw = subscription.get("end_date")
    if not end_raw:
        return False
    end = date.fromisoformat(str(end_raw)[:10])
    return end < date.today()


def _compute_renewal_period(
    subscription: dict,
    *,
    confirm_expired: bool,
    has_paid_before: bool,
) -> tuple[date, date, str]:
    today = date.today()
    end = date.fromisoformat(str(subscription["end_date"])[:10])
    subscription_type = subscription.get("subscription_type") or "monthly"

    if not has_paid_before:
        new_start = date.fromisoformat(str(subscription["start_date"])[:10])
        new_end = end
        if new_end < new_start:
            raise HTTPException(status_code=400, detail="Invalid subscription period.")
        billing_period = f"{new_start.isoformat()} to {new_end.isoformat()}"
        return new_start, new_end, billing_period

    if end >= today:
        new_start = end + timedelta(days=1)
    else:
        if not confirm_expired:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Subscription has expired. Set confirm_expired=true to renew manually."
                ),
            )
        new_start = today

    new_end = compute_subscription_end_date(new_start, subscription_type)
    if new_end < new_start:
        raise HTTPException(status_code=400, detail="Invalid renewal period.")

    billing_period = f"{new_start.isoformat()} to {new_end.isoformat()}"
    return new_start, new_end, billing_period


def _renewal_response(
    *,
    subscription_id: str,
    payment_id: str,
    razorpay_order_id: str,
    amount_paise: int,
    payment_status: str,
    idempotent: bool,
    recovered: bool = False,
) -> dict:
    return {
        "subscription_id": subscription_id,
        "payment_id": payment_id,
        "razorpay_order_id": razorpay_order_id,
        "amount": from_paise(amount_paise),
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": get_razorpay_key_id(),
        "payment_status": payment_status,
        "idempotent": idempotent,
        "recovered": recovered,
    }


def _payment_renewal_end(payment: dict) -> str:
    renewal_end = payment.get("renewal_end") or payment.get("renewal_due")
    if not renewal_end:
        raise HTTPException(status_code=500, detail="Renewal payment is missing period metadata.")
    return str(renewal_end)[:10]


async def _sync_subscription_from_payment(
    subscription_id: str,
    payment: dict,
    *,
    session=None,
) -> tuple[str, dict | None]:
    renewal_end = _payment_renewal_end(payment)
    outcome, subscription = await apply_subscription_renewal_once(
        subscription_id,
        renewal_end=renewal_end,
        renewal_start=payment.get("renewal_start"),
        session=session,
    )
    if outcome in {"changed", "already_applied"} and subscription:
        await mark_subscription_payment_synced(payment["payment_id"], session=session)
    return outcome, subscription


async def _repair_incomplete_renewal(
    subscription: dict,
    payment: dict,
    *,
    background_tasks: BackgroundTasks | None = None,
    notify: bool = False,
) -> dict:
    subscription_id = subscription["subscription_id"]
    if subscription_matches_renewal(subscription, payment) and payment.get("subscription_synced"):
        updated = await get_subscription_by_id(subscription_id)
        return {
            "success": True,
            "subscription_id": subscription_id,
            "payment_status": PAYMENT_STATUS_PAID,
            "idempotent": True,
            "recovered": True,
            "subscription": updated,
        }

    async def _repair(session):
        outcome, updated_subscription = await _sync_subscription_from_payment(
            subscription_id,
            payment,
            session=session,
        )
        if outcome == "not_found" or not updated_subscription:
            raise HTTPException(
                status_code=500,
                detail="Unable to complete subscription renewal after payment.",
            )
        return updated_subscription

    updated_subscription = await run_optional_transaction(_repair)

    if notify:
        await _notify_renewed(
            updated_subscription,
            payment,
            background_tasks=background_tasks,
        )

    return {
        "success": True,
        "subscription_id": subscription_id,
        "payment_status": PAYMENT_STATUS_PAID,
        "idempotent": True,
        "recovered": True,
        "subscription": updated_subscription,
    }


async def _notify_renewed(
    subscription: dict,
    payment: dict,
    *,
    background_tasks: BackgroundTasks | None = None,
) -> None:
    if background_tasks is not None:
        schedule_notification(
            background_tasks,
            notify_subscription_renewed,
            subscription,
            payment,
        )
    else:
        await notify_subscription_renewed(subscription, payment)


async def _resolve_existing_renewal_attempt(
    subscription: dict,
    *,
    billing_period: str,
    amount_paise: int,
    allow_paid_recovery: bool,
    background_tasks: BackgroundTasks | None = None,
) -> dict | None:
    subscription_id = subscription["subscription_id"]

    if allow_paid_recovery:
        incomplete = await find_incomplete_paid_renewal(subscription_id)
        if incomplete:
            if int(incomplete.get("amount_paise") or 0) != amount_paise:
                raise HTTPException(
                    status_code=409,
                    detail="Existing paid renewal amount does not match subscription price.",
                )
            repaired = await _repair_incomplete_renewal(
                subscription,
                incomplete,
                background_tasks=background_tasks,
            )
            return _renewal_response(
                subscription_id=subscription_id,
                payment_id=incomplete["payment_id"],
                razorpay_order_id=incomplete.get("razorpay_order_id") or "",
                amount_paise=amount_paise,
                payment_status=PAYMENT_STATUS_PAID,
                idempotent=True,
                recovered=True,
            )

    active = await find_active_renewal_for_billing_period(subscription_id, billing_period)
    if active and active.get("razorpay_order_id"):
        if int(active.get("amount_paise") or 0) != amount_paise:
            raise HTTPException(
                status_code=409,
                detail="Existing renewal amount does not match subscription price.",
            )
        if active.get("payment_status") == PAYMENT_STATUS_PAID and allow_paid_recovery:
            if not subscription_matches_renewal(subscription, active):
                await _repair_incomplete_renewal(
                    subscription,
                    active,
                    background_tasks=background_tasks,
                )
        return _renewal_response(
            subscription_id=subscription_id,
            payment_id=active["payment_id"],
            razorpay_order_id=active["razorpay_order_id"],
            amount_paise=amount_paise,
            payment_status=active.get("payment_status") or PAYMENT_STATUS_PROCESSING,
            idempotent=True,
            recovered=active.get("payment_status") == PAYMENT_STATUS_PAID,
        )

    pending = await find_pending_renewal_for_subscription(subscription_id)
    if pending and pending.get("razorpay_order_id"):
        if int(pending.get("amount_paise") or 0) != amount_paise:
            raise HTTPException(
                status_code=409,
                detail="Existing renewal amount does not match subscription price.",
            )
        return _renewal_response(
            subscription_id=subscription_id,
            payment_id=pending["payment_id"],
            razorpay_order_id=pending["razorpay_order_id"],
            amount_paise=amount_paise,
            payment_status=pending.get("payment_status") or PAYMENT_STATUS_PROCESSING,
            idempotent=True,
        )

    return None


async def create_subscription_renewal(
    *,
    subscription_id: str,
    user: dict,
    confirm_expired: bool = False,
    require_failed: bool = False,
    background_tasks: BackgroundTasks | None = None,
) -> dict:
    subscription = await get_subscription_by_id(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    assert_customer_owns_subscription(subscription, user)

    if subscription.get("status") == "cancelled":
        raise HTTPException(
            status_code=400,
            detail="Cancelled subscriptions cannot be renewed.",
        )

    payment_status = (subscription.get("payment_status") or PAYMENT_STATUS_PENDING).lower()
    if require_failed:
        incomplete = await find_incomplete_paid_renewal(subscription_id)
        if incomplete:
            await _repair_incomplete_renewal(
                subscription,
                incomplete,
                background_tasks=background_tasks,
            )
            return _renewal_response(
                subscription_id=subscription_id,
                payment_id=incomplete["payment_id"],
                razorpay_order_id=incomplete.get("razorpay_order_id") or "",
                amount_paise=int(incomplete.get("amount_paise") or 0),
                payment_status=PAYMENT_STATUS_PAID,
                idempotent=True,
                recovered=True,
            )
        if payment_status != PAYMENT_STATUS_FAILED:
            pending = await find_pending_renewal_for_subscription(subscription_id)
            if not pending:
                raise HTTPException(
                    status_code=400,
                    detail="Retry is only allowed when subscription payment_status is failed.",
                )
    elif payment_status == PAYMENT_STATUS_FAILED:
        raise HTTPException(
            status_code=400,
            detail="Use the retry endpoint when the last payment failed.",
        )

    new_start, new_end, billing_period = _compute_renewal_period(
        subscription,
        confirm_expired=confirm_expired,
        has_paid_before=await get_latest_paid_payment_for_subscription(subscription_id)
        is not None,
    )

    amount_paise = _subscription_amount_paise(subscription)

    existing_response = await _resolve_existing_renewal_attempt(
        subscription,
        billing_period=billing_period,
        amount_paise=amount_paise,
        allow_paid_recovery=require_failed or payment_status == PAYMENT_STATUS_PROCESSING,
        background_tasks=background_tasks,
    )
    if existing_response:
        return existing_response

    if require_failed and payment_status == PAYMENT_STATUS_FAILED:
        latest_failed = await find_pending_renewal_for_subscription(subscription_id)
        if latest_failed:
            return _renewal_response(
                subscription_id=subscription_id,
                payment_id=latest_failed["payment_id"],
                razorpay_order_id=latest_failed.get("razorpay_order_id") or "",
                amount_paise=amount_paise,
                payment_status=latest_failed.get("payment_status") or PAYMENT_STATUS_PROCESSING,
                idempotent=True,
            )

    receipt = f"sub_{subscription_id}"[-40:]

    try:
        rz_order = await create_razorpay_order(
            amount_paise=amount_paise,
            receipt=receipt,
            notes={
                "campusbite_subscription_id": subscription_id,
                "billing_period": billing_period,
            },
        )
    except PaymentConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    razorpay_order_id = rz_order.get("id")
    if not razorpay_order_id:
        raise HTTPException(status_code=502, detail="Razorpay did not return an order id.")

    now = datetime.now(UTC)
    payment_doc = {
        "subscription_id": subscription_id,
        "customer_email": subscription.get("customer_email"),
        "restaurant_email": subscription.get("restaurant_email"),
        "amount": from_paise(amount_paise),
        "amount_paise": amount_paise,
        "payment_status": PAYMENT_STATUS_PROCESSING,
        "payment_method": PAYMENT_METHOD_ONLINE,
        "billing_period": billing_period,
        "paid_at": None,
        "renewal_due": new_end.isoformat(),
        "transaction_reference": None,
        "razorpay_order_id": razorpay_order_id,
        "idempotency_key": f"sub_renew:{subscription_id}:{new_start.isoformat()}:{amount_paise}",
        "renewal_start": new_start.isoformat(),
        "renewal_end": new_end.isoformat(),
        "subscription_synced": False,
        "created_at": now,
    }

    payment_id, created = await insert_renewal_payment_if_absent(payment_doc)
    if not created:
        existing = await find_active_renewal_for_billing_period(subscription_id, billing_period)
        if existing and existing.get("razorpay_order_id"):
            return _renewal_response(
                subscription_id=subscription_id,
                payment_id=existing["payment_id"],
                razorpay_order_id=existing["razorpay_order_id"],
                amount_paise=amount_paise,
                payment_status=existing.get("payment_status") or PAYMENT_STATUS_PROCESSING,
                idempotent=True,
            )

    await update_subscription(
        subscription_id,
        {"payment_status": PAYMENT_STATUS_PROCESSING},
    )

    return _renewal_response(
        subscription_id=subscription_id,
        payment_id=payment_id,
        razorpay_order_id=razorpay_order_id,
        amount_paise=amount_paise,
        payment_status=PAYMENT_STATUS_PROCESSING,
        idempotent=not created,
    )


async def verify_subscription_renewal(
    *,
    subscription_id: str,
    user: dict,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    payment_id: str | None = None,
    background_tasks: BackgroundTasks | None = None,
) -> dict:
    subscription = await get_subscription_by_id(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    assert_customer_owns_subscription(subscription, user)

    if subscription.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Subscription is cancelled.")

    existing_paid = await get_payment_by_razorpay_payment_id(razorpay_payment_id)
    if existing_paid and existing_paid.get("payment_status") == PAYMENT_STATUS_PAID:
        if existing_paid.get("subscription_id") != subscription_id:
            raise HTTPException(
                status_code=409,
                detail="Payment reference already used for another subscription.",
            )
        return await _repair_incomplete_renewal(
            subscription,
            existing_paid,
            background_tasks=background_tasks,
            notify=False,
        )

    payment = None
    if payment_id:
        payment = await get_payment_by_id(payment_id, full=True)
        if payment and payment.get("subscription_id") != subscription_id:
            raise HTTPException(status_code=400, detail="Payment does not match subscription.")

    if not payment:
        payment = await get_payment_by_razorpay_order_id(razorpay_order_id)

    if not payment or payment.get("subscription_id") != subscription_id:
        raise HTTPException(
            status_code=400,
            detail="No matching renewal payment found for this subscription.",
        )

    if payment.get("payment_status") == PAYMENT_STATUS_PAID:
        return await _repair_incomplete_renewal(
            subscription,
            payment,
            background_tasks=background_tasks,
            notify=False,
        )

    stored_rz_order = payment.get("razorpay_order_id")
    if stored_rz_order and stored_rz_order != razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="razorpay_order_id does not match the renewal attempt.",
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
        await _mark_renewal_failed(
            subscription_id,
            payment["payment_id"],
            background_tasks=background_tasks,
            subscription=subscription,
        )
        raise HTTPException(status_code=400, detail="Invalid payment signature.")

    now = datetime.now(UTC)
    renewal_end = _payment_renewal_end(payment)

    async def _complete(session):
        changed, paid_payment = await mark_subscription_payment_paid_once(
            payment["payment_id"],
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            paid_at=now,
            renewal_due=renewal_end,
            session=session,
        )
        if not paid_payment:
            duplicate = await get_payment_by_razorpay_payment_id(razorpay_payment_id)
            if duplicate and duplicate.get("subscription_id") == subscription_id:
                changed = False
                paid_payment = duplicate
            else:
                raise HTTPException(
                    status_code=409,
                    detail="Payment reference already used.",
                )

        if paid_payment.get("payment_status") == PAYMENT_STATUS_PAID and (
            not paid_payment.get("subscription_synced")
            or not subscription_matches_renewal(subscription, paid_payment)
        ):
            outcome, updated_subscription = await _sync_subscription_from_payment(
                subscription_id,
                paid_payment,
                session=session,
            )
            if outcome == "not_found" or not updated_subscription:
                raise HTTPException(
                    status_code=500,
                    detail="Payment recorded but subscription renewal could not be applied.",
                )
            return changed, paid_payment, updated_subscription

        if subscription_matches_renewal(subscription, paid_payment):
            await mark_subscription_payment_synced(paid_payment["payment_id"], session=session)
            updated_subscription = await get_subscription_by_id(subscription_id, session=session)
            return changed, paid_payment, updated_subscription

        outcome, updated_subscription = await _sync_subscription_from_payment(
            subscription_id,
            paid_payment,
            session=session,
        )
        if outcome == "not_found" or not updated_subscription:
            raise HTTPException(
                status_code=500,
                detail="Payment recorded but subscription renewal could not be applied.",
            )
        return changed, paid_payment, updated_subscription

    payment_changed, paid_payment, updated_subscription = await run_optional_transaction(
        _complete
    )

    if payment_changed:
        await _notify_renewed(
            updated_subscription,
            paid_payment,
            background_tasks=background_tasks,
        )

    return {
        "success": True,
        "subscription_id": subscription_id,
        "payment_status": PAYMENT_STATUS_PAID,
        "razorpay_payment_id": razorpay_payment_id,
        "idempotent": not payment_changed,
        "recovered": not payment_changed,
        "subscription": updated_subscription,
    }


async def _mark_renewal_failed(
    subscription_id: str,
    payment_id: str,
    *,
    subscription: dict | None = None,
    background_tasks: BackgroundTasks | None = None,
) -> None:
    async def _fail(session):
        await mark_subscription_payment_failed_once(payment_id, session=session)
        await update_subscription(
            subscription_id,
            {"payment_status": PAYMENT_STATUS_FAILED},
            session=session,
        )

    await run_optional_transaction(_fail)

    sub = subscription or await get_subscription_by_id(subscription_id)
    if not sub:
        return

    if background_tasks is not None:
        schedule_notification(
            background_tasks,
            notify_subscription_payment_failed,
            sub,
        )
    else:
        await notify_subscription_payment_failed(sub)


async def mock_complete_subscription_renewal(
    *,
    subscription_id: str,
    user: dict,
    outcome: str,
    background_tasks: BackgroundTasks | None = None,
) -> dict:
    if not is_razorpay_mock_mode():
        raise HTTPException(
            status_code=403,
            detail="Mock renewal is only available when RAZORPAY_MOCK=1.",
        )

    normalized = (outcome or "").strip().lower()
    if normalized not in {"success", "failure", "dismiss"}:
        raise HTTPException(
            status_code=400,
            detail="outcome must be success, failure, or dismiss",
        )

    subscription = await get_subscription_by_id(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    assert_customer_owns_subscription(subscription, user)

    payment = await find_pending_renewal_for_subscription(subscription_id)
    if not payment:
        incomplete = await find_incomplete_paid_renewal(subscription_id)
        if incomplete and normalized == "success":
            return await _repair_incomplete_renewal(
                subscription,
                incomplete,
                background_tasks=background_tasks,
                notify=False,
            )
        raise HTTPException(
            status_code=400,
            detail="Create a renewal payment before completing mock checkout.",
        )

    razorpay_order_id = payment.get("razorpay_order_id")
    if not razorpay_order_id:
        raise HTTPException(status_code=400, detail="Missing Razorpay order id.")

    if normalized == "dismiss":
        await update_subscription_payment(
            payment["payment_id"],
            {"payment_status": PAYMENT_STATUS_PENDING},
        )
        await update_subscription(subscription_id, {"payment_status": PAYMENT_STATUS_PENDING})
        return {
            "success": True,
            "subscription_id": subscription_id,
            "payment_status": PAYMENT_STATUS_PENDING,
            "outcome": "dismiss",
            "mock": True,
        }

    if normalized == "failure":
        await _mark_renewal_failed(
            subscription_id,
            payment["payment_id"],
            subscription=subscription,
            background_tasks=background_tasks,
        )
        return {
            "success": False,
            "subscription_id": subscription_id,
            "payment_status": PAYMENT_STATUS_FAILED,
            "outcome": "failure",
            "mock": True,
        }

    razorpay_payment_id = f"pay_mock_{subscription_id[-8:]}"
    signature = build_mock_signature(razorpay_order_id, razorpay_payment_id)
    return await verify_subscription_renewal(
        subscription_id=subscription_id,
        user=user,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=signature,
        payment_id=payment["payment_id"],
        background_tasks=background_tasks,
    )
