"""Base notification provider contract."""

from __future__ import annotations

from abc import ABC, abstractmethod


class NotificationProvider(ABC):
    name: str

    @abstractmethod
    async def send(
        self,
        *,
        recipient: str,
        subject: str,
        body: str,
        notification_type: str,
    ) -> str:
        """Send a message. Returns delivery status string."""
