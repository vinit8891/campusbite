"""Notification provider configuration."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from app.core.config import get_settings, resolve_resend_api_key

load_dotenv()

PROVIDER_MOCK = "mock"
PROVIDER_SMTP = "smtp"
PROVIDER_RESEND = "resend"


def resolve_resend_key() -> str:
    """Resolve active Resend API key from settings or environment variables."""
    s = get_settings()
    if s.RESEND_API_KEY:
        return s.RESEND_API_KEY
    return resolve_resend_api_key(
        resend_api_key=os.getenv("RESEND_API_KEY"),
        smtp_host=os.getenv("SMTP_HOST"),
        smtp_password=os.getenv("SMTP_PASSWORD"),
    )


def resend_configured() -> bool:
    """Return True if a valid Resend API key is detected."""
    return bool(resolve_resend_key())


def notification_provider() -> str:
    """Determine the active notification provider.
    
    Priority:
    1. If NOTIFICATION_PROVIDER is explicitly set to 'mock', use mock.
    2. If Resend is configured (via RESEND_API_KEY, SMTP_PASSWORD starting with 're_', or host 'smtp.resend.com'),
       ALWAYS use PROVIDER_RESEND to bypass blocked SMTP ports on platforms like Render.
    3. If NOTIFICATION_PROVIDER is set to 'smtp' or 'resend', honor it.
    4. If standard non-Resend SMTP is configured, use PROVIDER_SMTP.
    5. Fallback to PROVIDER_MOCK.
    """
    value = (os.getenv("NOTIFICATION_PROVIDER") or "").strip().lower()
    if value == PROVIDER_MOCK:
        return PROVIDER_MOCK

    if resend_configured():
        return PROVIDER_RESEND

    if value in {PROVIDER_SMTP, PROVIDER_RESEND}:
        return value

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
    """Return True if standard SMTP is configured.
    
    Returns False if pointing to Resend SMTP to prevent blocked socket connection attempts.
    """
    settings = smtp_settings()
    host = str(settings.get("host") or "").strip().lower()
    password = str(settings.get("password") or "").strip()
    if host == "smtp.resend.com" or password.startswith("re_"):
        return False

    return bool(
        settings["host"]
        and settings["from_address"]
        and settings["username"]
        and settings["password"]
    )
