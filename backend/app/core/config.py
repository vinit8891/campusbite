"""Application configuration and settings from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _is_truthy(val: str | None) -> bool:
    return str(val or "").strip().lower() in ("true", "1", "yes", "on")


@dataclass(frozen=True)
class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "CampusBite API").strip() or "CampusBite API"
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0").strip() or "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip() or "development"

    # Transactional Email Transport (SMTP / Resend)
    SMTP_HOST: str = (
        os.getenv("SMTP_HOST")
        or ("smtp.resend.com" if os.getenv("RESEND_API_KEY") else "")
    ).strip()
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587").strip() or "587")
    SMTP_USER: str = (
        os.getenv("SMTP_USER")
        or os.getenv("SMTP_USERNAME")
        or ("resend" if os.getenv("RESEND_API_KEY") else "")
    ).strip()
    SMTP_PASSWORD: str = (
        os.getenv("SMTP_PASSWORD") or os.getenv("RESEND_API_KEY") or ""
    ).strip()
    SMTP_FROM_EMAIL: str = (
        os.getenv("SMTP_FROM_EMAIL")
        or os.getenv("SMTP_FROM")
        or os.getenv("RESEND_FROM_EMAIL")
        or "noreply@campusbite.com"
    ).strip()
    SMTP_TLS: bool = _is_truthy(os.getenv("SMTP_TLS", "true"))

    # Sentry Observability
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "").strip()


def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def app_name() -> str:
    return settings.APP_NAME


def app_version() -> str:
    return settings.APP_VERSION


def environment() -> str:
    return settings.ENVIRONMENT
