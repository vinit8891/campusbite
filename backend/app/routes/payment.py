"""Payment API routes — Razorpay test-mode foundation (no frontend checkout)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.auth.auth import require_roles
from app.auth.roles import ADMIN, CUSTOMER, RESTAURANT_OWNER
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


@router.get("/razorpay/config")
async def razorpay_public_config(
    _: Annotated[dict, Depends(require_roles(CUSTOMER, ADMIN))],
):
    """Public key only — never returns secrets."""
    return payment_service.get_public_config()


@router.post("/razorpay/create")
async def create_razorpay_payment(
    body: CreateRazorpayPaymentRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    return await payment_service.create_online_payment_for_order(
        order_id=body.order_id,
        user=current_user,
        client_amount=body.amount,
    )


@router.post("/razorpay/verify")
async def verify_razorpay_payment(
    body: VerifyRazorpayPaymentRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    return await payment_service.verify_online_payment(
        order_id=body.order_id,
        user=current_user,
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
    )


@router.post("/razorpay/cancel")
async def cancel_razorpay_payment(
    body: CancelPaymentRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    return await payment_service.cancel_online_payment(
        order_id=body.order_id,
        user=current_user,
        reason=body.reason,
    )


@router.post("/razorpay/mock-complete")
async def mock_complete_razorpay_checkout(
    body: MockCheckoutCompleteRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    """
    Mock-mode only. Simulates Checkout success/failure/dismiss without
    exposing secrets to the browser.
    """
    return await payment_service.mock_complete_checkout(
        order_id=body.order_id,
        user=current_user,
        outcome=body.outcome,
    )


@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Annotated[str | None, Header()] = None,
):
    body = await request.body()
    return await payment_service.process_razorpay_webhook(
        body=body,
        signature=x_razorpay_signature,
    )


@router.post("/refunds")
async def create_refund(
    body: CreateRefundRequest,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
):
    """Validate and execute a Razorpay TEST refund (idempotent)."""
    return await payment_service.create_refund_request(
        order_id=body.order_id,
        amount_paise=body.amount_paise,
        reason=body.reason,
        idempotency_key=body.idempotency_key,
        actor=current_user,
    )
