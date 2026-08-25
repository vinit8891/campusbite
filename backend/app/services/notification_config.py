"""Notification provider configuration."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from app.core.config import get_settings

load_dotenv()

PROVIDER_MOCK = "mock"
PROVIDER_SMTP = "smtp"
PROVIDER_RESEND = "resend"


def resend_configured() -> bool:
    s = get_settings()
    return bool(s.RESEND_API_KEY)


def notification_provider() -> str:
    value = (os.getenv("NOTIFICATION_PROVIDER") or "").strip().lower()
    if value in {PROVIDER_MOCK, PROVIDER_SMTP, PROVIDER_RESEND}:
        return value
    # Priority: Resend REST API (bypasses blocked SMTP ports) > SMTP > Mock
    if resend_configured():
        return PROVIDER_RESEND
    if smtp_configured():
        return PROVIDER_SMTP
    return PROVIDER_MOCK


def smtp_settings() -> dict[str, str | int | bool]:
    s = get_settings()
    return {
        "host": s.SMTP_HOST,
        "port": s.SMTP_PORT,
        "username": s.SMTP_USER,
        "password": s.SMTP_PASSWORD,
        "from_address": s.SMTP_FROM_EMAIL,
        "tls": s.SMTP_TLS,
    }


def smtp_configured() -> bool:
    settings = smtp_settings()
    return bool(
        settings["host"]
        and settings["from_address"]
        and settings["username"]
        and settings["password"]
    )
