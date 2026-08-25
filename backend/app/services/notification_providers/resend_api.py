"""Resend HTTPS REST API email notification provider."""

from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.notification_log import STATUS_FAILED, STATUS_SENT
from app.services.notification_providers.base import NotificationProvider

logger = get_logger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class ResendApiNotificationProvider(NotificationProvider):
    name = "resend"

    def __init__(
        self,
        api_key: str | None = None,
        from_email: str | None = None,
    ) -> None:
        settings = get_settings()
        self._api_key = (api_key or settings.RESEND_API_KEY).strip()
        self._from_email = (
            from_email
            or settings.SMTP_FROM_EMAIL
            or "noreply@campusbite.com"
        ).strip()

    async def send(
        self,
        *,
        recipient: str,
        subject: str,
        body: str,
        notification_type: str,
    ) -> str:
        if not self._api_key:
            logger.error(
                "notification.resend_api failed: missing RESEND_API_KEY type=%s recipient=%s",
                notification_type,
                recipient,
            )
            return STATUS_FAILED

        # Build payload
        html_content = body
        if not (
            body.strip().startswith("<")
            and (
                "</html>" in body.lower()
                or "</div>" in body.lower()
                or "<p>" in body.lower()
            )
        ):
            html_content = body.replace("\n", "<br>")

        payload = {
            "from": self._from_email,
            "to": [recipient],
            "subject": subject,
            "html": html_content,
        }

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    RESEND_API_URL,
                    headers=headers,
                    json=payload,
                )

            if response.status_code in (200, 201):
                logger.info(
                    "notification.resend_api sent type=%s recipient=%s status_code=%s",
                    notification_type,
                    recipient,
                    response.status_code,
                )
                return STATUS_SENT

            logger.error(
                "notification.resend_api failed type=%s recipient=%s status_code=%s response=%s",
                notification_type,
                recipient,
                response.status_code,
                response.text,
            )
            return STATUS_FAILED

        except Exception as exc:
            logger.exception(
                "notification.resend_api error type=%s recipient=%s error=%s",
                notification_type,
                recipient,
                exc,
            )
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(exc)
            except Exception:
                pass
            return STATUS_FAILED
