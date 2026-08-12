"""Notification provider configuration."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

PROVIDER_MOCK = "mock"
PROVIDER_SMTP = "smtp"


def notification_provider() -> str:
    value = (os.getenv("NOTIFICATION_PROVIDER") or PROVIDER_MOCK).strip().lower()
    if value not in {PROVIDER_MOCK, PROVIDER_SMTP}:
        return PROVIDER_MOCK
    return value


def smtp_settings() -> dict[str, str | int]:
    port_raw = (os.getenv("SMTP_PORT") or "587").strip()
    try:
        port = int(port_raw)
    except ValueError:
        port = 587

    return {
        "host": (os.getenv("SMTP_HOST") or "").strip(),
        "port": port,
        "username": (os.getenv("SMTP_USERNAME") or "").strip(),
        "password": (os.getenv("SMTP_PASSWORD") or "").strip(),
        "from_address": (os.getenv("SMTP_FROM") or "").strip(),
    }


def smtp_configured() -> bool:
    settings = smtp_settings()
    return bool(
        settings["host"]
        and settings["from_address"]
        and settings["username"]
        and settings["password"]
    )
