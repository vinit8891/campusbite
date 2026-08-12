"""Payment API routes — Razorpay test-mode foundation (no frontend checkout)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.auth.auth import require_roles
from app.auth.roles import ADMIN, CUSTOMER, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.payments import service as payment_service
from app.schemas.payment import (
    CancelPaymentRequest,
    CreateRazorpayPaymentRequest,
    CreateRefundRequest,
    MockCheckoutCompleteRequest,
    VerifyRazorpayPaymentRequest,
)

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)

logger = get_logger(__name__)


@router.get("/razorpay/config")
async def razorpay_public_config(
    _: Annotated[dict, Depends(require_roles(CUSTOMER, ADMIN))],
):
    """Public key only — never returns secrets."""
    logger.info("payments.razorpay_config request received")
    result = payment_service.get_public_config()
    logger.info("payments.razorpay_config completed successfully")
    return result


@router.post("/razorpay/create")
async def create_razorpay_payment(
    body: CreateRazorpayPaymentRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info("payments.create request received order_id=%s", body.order_id)
    result = await payment_service.create_online_payment_for_order(
        order_id=body.order_id,
        user=current_user,
        client_amount=body.amount,
    )
    logger.info("payments.create completed successfully order_id=%s", body.order_id)
    return result


@router.post("/razorpay/verify")
async def verify_razorpay_payment(
    body: VerifyRazorpayPaymentRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    # Never log signatures or payment secrets
    logger.info("payments.verify request received order_id=%s", body.order_id)
    result = await payment_service.verify_online_payment(
        order_id=body.order_id,
        user=current_user,
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
    )
    logger.info("payments.verify completed successfully order_id=%s", body.order_id)
    return result


@router.post("/razorpay/cancel")
async def cancel_razorpay_payment(
    body: CancelPaymentRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info("payments.cancel request received order_id=%s", body.order_id)
    result = await payment_service.cancel_online_payment(
        order_id=body.order_id,
        user=current_user,
        reason=body.reason,
    )
    logger.info("payments.cancel completed successfully order_id=%s", body.order_id)
    return result


@router.post("/razorpay/mock-complete")
async def mock_complete_razorpay_checkout(
    body: MockCheckoutCompleteRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    """
    Mock-mode only. Simulates Checkout success/failure/dismiss without
    exposing secrets to the browser.
    """
    logger.info(
        "payments.mock_complete request received order_id=%s outcome=%s",
        body.order_id,
        body.outcome,
    )
    result = await payment_service.mock_complete_checkout(
        order_id=body.order_id,
        user=current_user,
        outcome=body.outcome,
    )
    logger.info(
        "payments.mock_complete completed successfully order_id=%s",
        body.order_id,
    )
    return result


@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Annotated[str | None, Header()] = None,
):
    logger.info("payments.webhook request received")
    body = await request.body()
    # Never log webhook signature or raw body (may contain PII / secrets)
    result = await payment_service.process_razorpay_webhook(
        body=body,
        signature=x_razorpay_signature,
    )
    logger.info("payments.webhook completed successfully")
    return result


@router.post("/refunds")
async def create_refund(
    body: CreateRefundRequest,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
):
    """Validate and execute a Razorpay TEST refund (idempotent)."""
    logger.info("payments.refund request received order_id=%s", body.order_id)
    result = await payment_service.create_refund_request(
        order_id=body.order_id,
        amount_paise=body.amount_paise,
        reason=body.reason,
        idempotency_key=body.idempotency_key,
        actor=current_user,
    )
    logger.info("payments.refund completed successfully order_id=%s", body.order_id)
    return result

