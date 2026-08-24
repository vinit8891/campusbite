"""SMTP email notification provider."""

from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from app.core.logging import get_logger
from app.services.notification_config import smtp_settings
from app.services.notification_log import STATUS_FAILED, STATUS_SENT
from app.services.notification_providers.base import NotificationProvider

logger = get_logger(__name__)


def _send_smtp_sync(
    *,
    recipient: str,
    subject: str,
    body: str,
    settings: dict,
) -> None:
    message = EmailMessage()
    message["From"] = str(settings.get("from_address") or "noreply@campusbite.com")
    message["To"] = recipient
    message["Subject"] = subject

    if body.strip().startswith("<") and ("</html>" in body.lower() or "</div>" in body.lower()):
        message.add_alternative(body, subtype="html")
    else:
        message.set_content(body)

    host = str(settings.get("host") or "")
    port = int(settings.get("port") or 587)
    username = str(settings.get("username") or "")
    password = str(settings.get("password") or "")
    use_tls = bool(settings.get("tls", True))

    with smtplib.SMTP(host, port, timeout=30) as server:
        if use_tls:
            server.starttls()
        if username and password:
            server.login(username, password)
        server.send_message(message)


class SmtpNotificationProvider(NotificationProvider):
    name = "smtp"

    async def send(
        self,
        *,
        recipient: str,
        subject: str,
        body: str,
        notification_type: str,
    ) -> str:
        settings = smtp_settings()
        try:
            await asyncio.to_thread(
                _send_smtp_sync,
                recipient=recipient,
                subject=subject,
                body=body,
                settings=settings,
            )
            logger.info(
                "notification.smtp sent type=%s recipient=%s",
                notification_type,
                recipient,
            )
            return STATUS_SENT
        except Exception:
            logger.exception(
                "notification.smtp failed type=%s recipient=%s",
                notification_type,
                recipient,
            )
            return STATUS_FAILED
