"""Subscription renewal billing routes."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.auth.auth import require_roles
from app.auth.roles import CUSTOMER
from app.core.logging import get_logger
from app.schemas.subscription_billing import (
    SubscriptionMockRenewalRequest,
    SubscriptionRenewRequest,
    SubscriptionVerifyRenewalRequest,
)
from app.services import subscription_billing as billing_service

logger = get_logger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscription Billing"])


@router.post("/{subscription_id}/renew")
async def renew_subscription(
    subscription_id: str,
    body: SubscriptionRenewRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info("subscriptions.renew request subscription_id=%s", subscription_id)
    result = await billing_service.create_subscription_renewal(
        subscription_id=subscription_id,
        user=current_user,
        confirm_expired=body.confirm_expired,
    )
    logger.info("subscriptions.renew completed subscription_id=%s", subscription_id)
    return result


@router.post("/{subscription_id}/verify-renewal")
async def verify_subscription_renewal_route(
    subscription_id: str,
    body: SubscriptionVerifyRenewalRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info(
        "subscriptions.verify_renewal request subscription_id=%s",
        subscription_id,
    )
    try:
        result = await billing_service.verify_subscription_renewal(
            subscription_id=subscription_id,
            user=current_user,
            razorpay_order_id=body.razorpay_order_id,
            razorpay_payment_id=body.razorpay_payment_id,
            razorpay_signature=body.razorpay_signature,
            payment_id=body.payment_id,
            background_tasks=background_tasks,
        )
    except HTTPException as exc:
        if exc.status_code == 400 and "Invalid payment signature" in str(exc.detail):
            return {
                "success": False,
                "subscription_id": subscription_id,
                "payment_status": billing_service.PAYMENT_STATUS_FAILED,
            }
        raise
    logger.info(
        "subscriptions.verify_renewal completed subscription_id=%s",
        subscription_id,
    )
    return result


@router.post("/{subscription_id}/retry")
async def retry_subscription_renewal(
    subscription_id: str,
    body: SubscriptionRenewRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info("subscriptions.retry request subscription_id=%s", subscription_id)
    result = await billing_service.create_subscription_renewal(
        subscription_id=subscription_id,
        user=current_user,
        confirm_expired=body.confirm_expired,
        require_failed=True,
    )
    logger.info("subscriptions.retry completed subscription_id=%s", subscription_id)
    return result


@router.post("/{subscription_id}/mock-complete-renewal")
async def mock_complete_subscription_renewal_route(
    subscription_id: str,
    body: SubscriptionMockRenewalRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    return await billing_service.mock_complete_subscription_renewal(
        subscription_id=subscription_id,
        user=current_user,
        outcome=body.outcome,
        background_tasks=background_tasks,
    )
