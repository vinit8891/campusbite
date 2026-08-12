"""Development notification provider — logs only."""

from __future__ import annotations

from app.core.logging import get_logger
from app.services.notification_log import STATUS_MOCKED
from app.services.notification_providers.base import NotificationProvider

logger = get_logger(__name__)


class MockNotificationProvider(NotificationProvider):
    name = "mock"

    async def send(
        self,
        *,
        recipient: str,
        subject: str,
        body: str,
        notification_type: str,
    ) -> str:
        logger.info(
            "notification.mock type=%s recipient=%s subject=%s",
            notification_type,
            recipient,
            subject,
        )
        return STATUS_MOCKED
