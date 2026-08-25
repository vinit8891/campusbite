"""Reusable notification layer — all outbound notifications go through here."""

from __future__ import annotations

from typing import Any

from fastapi import BackgroundTasks

from app.core.logging import get_logger
from app.core.sanitize import sanitize_email
from app.models.delivery_partner import get_delivery_partner_by_phone
from app.models.order import get_order_by_id
from app.services.notification_config import (
    PROVIDER_RESEND,
    PROVIDER_SMTP,
    notification_provider,
    resend_configured,
    smtp_configured,
)
from app.services.notification_log import STATUS_FAILED, log_notification
from app.services.notification_providers.base import NotificationProvider
from app.services.notification_providers.mock import MockNotificationProvider
from app.services.notification_providers.resend_api import ResendApiNotificationProvider
from app.services.notification_providers.smtp import SmtpNotificationProvider
from app.services.notification_templates import (
    TEMPLATE_CUSTOMER_ORDER_PLACED,
    TEMPLATE_DELIVERY_PARTNER_ASSIGNED,
    TEMPLATE_ORDER_DELIVERED,
    TEMPLATE_PASSWORD_RESET,
    TEMPLATE_REFUND_INITIATED,
    TEMPLATE_RESTAURANT_NEW_ORDER,
    TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_CUSTOMER,
    TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_RESTAURANT,
    TEMPLATE_SUBSCRIPTION_PAYMENT_FAILED_CUSTOMER,
    TEMPLATE_SUBSCRIPTION_RENEWED_CUSTOMER,
    TEMPLATE_SUBSCRIPTION_RENEWED_RESTAURANT,
    render_template,
)

logger = get_logger(__name__)


class NotificationService:
    def __init__(self, provider: NotificationProvider) -> None:
        self._provider = provider

    @property
    def provider_name(self) -> str:
        return self._provider.name

    async def send(
        self,
        notification_type: str,
        recipient: str | None = None,
        context: dict[str, Any] | None = None,
        customer_id: str | None = None,
        recipient_email: str | None = None,
        **kwargs: Any,
    ) -> None:
        raw_email = recipient or recipient_email
        email = sanitize_email(raw_email)
        if not email:
            logger.warning(
                "notification skipped type=%s reason=missing_recipient",
                notification_type,
            )
            return

        status = STATUS_FAILED
        try:
            subject, body = render_template(notification_type, context or {})
            status = await self._provider.send(
                recipient=email,
                subject=subject,
                body=body,
                notification_type=notification_type,
            )
        except Exception as exc:
            logger.exception(
                "notification dispatch failed type=%s recipient=%s error=%s",
                notification_type,
                email,
                exc,
            )
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(exc)
            except Exception:
                pass
            status = STATUS_FAILED

        try:
            await log_notification(
                recipient=email,
                notification_type=notification_type,
                provider=self.provider_name,
                status=status,
                customer_id=customer_id,
                **kwargs,
            )
        except Exception as exc:
            logger.exception(
                "notification logging failed type=%s recipient=%s error=%s",
                notification_type,
                email,
                exc,
            )
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(exc)
            except Exception:
                pass


def get_notification_service() -> NotificationService:
    selected = notification_provider()
    if selected == PROVIDER_RESEND and resend_configured():
        return NotificationService(ResendApiNotificationProvider())
    if selected == PROVIDER_RESEND and not resend_configured():
        logger.warning(
            "NOTIFICATION_PROVIDER=resend but RESEND_API_KEY is missing; falling back"
        )
    if selected == PROVIDER_SMTP and smtp_configured():
        return NotificationService(SmtpNotificationProvider())
    if selected == PROVIDER_SMTP and not smtp_configured():
        logger.warning(
            "NOTIFICATION_PROVIDER=smtp but SMTP settings incomplete; using mock logger"
        )
    return NotificationService(MockNotificationProvider())


def _order_context(order: dict[str, Any]) -> dict[str, Any]:
    return {
        "order_id": str(order.get("_id") or ""),
        "customer_name": order.get("customer_name"),
        "customer_email": order.get("customer_email"),
        "restaurant_email": order.get("restaurant_email"),
        "total": order.get("total"),
        "status": order.get("status"),
        "delivery_partner": order.get("delivery_partner") or {},
    }


# ---------------------------------------------------------------------------
# Canonical Notification Helper Functions
# ---------------------------------------------------------------------------

async def send_order_confirmation(order_id: str, **kwargs: Any) -> None:
    """Send order confirmation email to the customer and alert restaurant."""
    await notify_order_placed(order_id, **kwargs)


async def send_password_reset_email(
    email: str,
    reset_link: str,
    customer_name: str = "User",
    customer_id: str | None = None,
    **kwargs: Any,
) -> None:
    """Dispatch password reset recovery email with 15-minute token link."""
    try:
        service = get_notification_service()
        await service.send(
            notification_type=TEMPLATE_PASSWORD_RESET,
            recipient=email,
            customer_id=customer_id,
            context={
                "customer_name": customer_name,
                "reset_link": reset_link,
            },
            **kwargs,
        )
    except Exception as exc:
        logger.exception("send_password_reset_email failed for %s: %s", email, exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def send_restaurant_status_update(order_id: str, status: str, **kwargs: Any) -> None:
    """Dispatch status update notification to the customer for an order."""
    try:
        order = await get_order_by_id(order_id)
        if not order:
            return

        service = get_notification_service()
        context = _order_context(order)
        context["status"] = status
        cust_id = str(order.get("customer_id") or order.get("user_id") or "") or None

        if status.lower() == "delivered":
            await service.send(
                TEMPLATE_ORDER_DELIVERED,
                order.get("customer_email"),
                context,
                customer_id=cust_id,
                **kwargs,
            )
        else:
            await service.send(
                TEMPLATE_CUSTOMER_ORDER_PLACED,
                order.get("customer_email"),
                context,
                customer_id=cust_id,
                **kwargs,
            )
    except Exception as exc:
        logger.exception("send_restaurant_status_update failed for order_id=%s: %s", order_id, exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_order_placed(order_id: str, **kwargs: Any) -> None:
    try:
        order = await get_order_by_id(order_id)
        if not order:
            return

        service = get_notification_service()
        context = _order_context(order)
        cust_id = str(order.get("customer_id") or order.get("user_id") or "") or None

        await service.send(
            TEMPLATE_CUSTOMER_ORDER_PLACED,
            order.get("customer_email"),
            context,
            customer_id=cust_id,
            **kwargs,
        )
        await service.send(
            TEMPLATE_RESTAURANT_NEW_ORDER,
            order.get("restaurant_email"),
            context,
            customer_id=cust_id,
            **kwargs,
        )
    except Exception as exc:
        logger.exception("notify_order_placed failed for order_id=%s: %s", order_id, exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_order_accepted(order_id: str, **kwargs: Any) -> None:
    try:
        order = await get_order_by_id(order_id)
        if not order:
            return

        service = get_notification_service()
        context = _order_context(order)
        context["status"] = "Accepted"
        cust_id = str(order.get("customer_id") or order.get("user_id") or "") or None

        await service.send(
            TEMPLATE_CUSTOMER_ORDER_PLACED,
            order.get("customer_email"),
            context,
            customer_id=cust_id,
            **kwargs,
        )
    except Exception as exc:
        logger.exception("notify_order_accepted failed for order_id=%s: %s", order_id, exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_delivery_assigned(order_id: str, **kwargs: Any) -> None:
    try:
        order = await get_order_by_id(order_id)
        if not order:
            return

        service = get_notification_service()
        context = _order_context(order)
        partner = order.get("delivery_partner") or {}
        partner_email = None
        partner_phone = partner.get("phone")
        if partner_phone:
            partner_doc = await get_delivery_partner_by_phone(str(partner_phone))
            if partner_doc:
                partner_email = partner_doc.get("email")

        cust_id = str(order.get("customer_id") or order.get("user_id") or "") or None
        await service.send(
            TEMPLATE_DELIVERY_PARTNER_ASSIGNED,
            partner_email,
            context,
            customer_id=cust_id,
            **kwargs,
        )
    except Exception as exc:
        logger.exception("notify_delivery_assigned failed for order_id=%s: %s", order_id, exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_order_delivered(order_id: str, **kwargs: Any) -> None:
    try:
        order = await get_order_by_id(order_id)
        if not order:
            return

        service = get_notification_service()
        context = _order_context(order)
        context["status"] = "Delivered"
        cust_id = str(order.get("customer_id") or order.get("user_id") or "") or None

        await service.send(
            TEMPLATE_ORDER_DELIVERED,
            order.get("customer_email"),
            context,
            customer_id=cust_id,
            **kwargs,
        )
    except Exception as exc:
        logger.exception("notify_order_delivered failed for order_id=%s: %s", order_id, exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_refund_initiated(
    order_id: str,
    refund_id: str | None = None,
    **kwargs: Any,
) -> None:
    try:
        order = await get_order_by_id(order_id)
        if not order:
            return

        service = get_notification_service()
        context = _order_context(order)
        context["refund_id"] = refund_id
        cust_id = str(order.get("customer_id") or order.get("user_id") or "") or None

        await service.send(
            TEMPLATE_REFUND_INITIATED,
            order.get("customer_email"),
            context,
            customer_id=cust_id,
            **kwargs,
        )
    except Exception as exc:
        logger.exception("notify_refund_initiated failed for order_id=%s: %s", order_id, exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_subscription_orders_generated(
    result: dict,
    target_date,
    **kwargs: Any,
) -> None:
    try:
        order_ids = result.get("order_ids") or []
        if not order_ids:
            return

        service = get_notification_service()
        restaurant_counts: dict[str, int] = {}
        target_iso = (
            target_date.isoformat()
            if hasattr(target_date, "isoformat")
            else str(target_date)
        )

        for order_id in order_ids:
            order = await get_order_by_id(order_id)
            if not order:
                continue

            context = _order_context(order)
            context["target_date"] = target_iso
            items = order.get("items") or []
            context["meal_name"] = items[0].get("name") if items else "Mess meal"
            cust_id = str(order.get("customer_id") or order.get("user_id") or "") or None

            await service.send(
                TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_CUSTOMER,
                order.get("customer_email"),
                context,
                customer_id=cust_id,
                **kwargs,
            )

            restaurant_email = order.get("restaurant_email")
            if restaurant_email:
                restaurant_counts[str(restaurant_email).lower()] = (
                    restaurant_counts.get(str(restaurant_email).lower(), 0) + 1
                )

        for restaurant_email, meal_count in restaurant_counts.items():
            await service.send(
                TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_RESTAURANT,
                restaurant_email,
                {
                    "target_date": target_iso,
                    "meal_count": meal_count,
                    "restaurant_email": restaurant_email,
                },
                **kwargs,
            )
    except Exception as exc:
        logger.exception("notify_subscription_orders_generated failed: %s", exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_subscription_renewed(
    subscription: dict,
    payment: dict | None = None,
    **kwargs: Any,
) -> None:
    try:
        service = get_notification_service()
        context = {
            "customer_name": subscription.get("customer_email"),
            "plan_name": subscription.get("plan_name")
            or f"{subscription.get('meal_type')} · {subscription.get('subscription_type')}",
            "billing_period": (payment or {}).get("billing_period"),
            "amount": (payment or {}).get("amount"),
            "customer_email": subscription.get("customer_email"),
            "restaurant_email": subscription.get("restaurant_email"),
        }
        cust_id = str(subscription.get("customer_id") or subscription.get("user_id") or "") or None

        await service.send(
            TEMPLATE_SUBSCRIPTION_RENEWED_CUSTOMER,
            subscription.get("customer_email"),
            context,
            customer_id=cust_id,
            **kwargs,
        )

        restaurant_email = subscription.get("restaurant_email")
        if restaurant_email:
            await service.send(
                TEMPLATE_SUBSCRIPTION_RENEWED_RESTAURANT,
                restaurant_email,
                context,
                customer_id=cust_id,
                **kwargs,
            )
    except Exception as exc:
        logger.exception("notify_subscription_renewed failed: %s", exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


async def notify_subscription_payment_failed(subscription: dict, **kwargs: Any) -> None:
    try:
        service = get_notification_service()
        context = {
            "customer_name": subscription.get("customer_email"),
            "plan_name": subscription.get("plan_name")
            or f"{subscription.get('meal_type')} · {subscription.get('subscription_type')}",
        }
        cust_id = str(subscription.get("customer_id") or subscription.get("user_id") or "") or None
        await service.send(
            TEMPLATE_SUBSCRIPTION_PAYMENT_FAILED_CUSTOMER,
            subscription.get("customer_email"),
            context,
            customer_id=cust_id,
            **kwargs,
        )
    except Exception as exc:
        logger.exception("notify_subscription_payment_failed failed: %s", exc)
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass


def schedule_notification(
    background_tasks: BackgroundTasks,
    task,
    *args,
    **kwargs,
) -> None:
    """Queue a notification coroutine without blocking the API response."""
    background_tasks.add_task(task, *args, **kwargs)
