"""Application metadata from environment."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def app_name() -> str:
    return (os.getenv("APP_NAME") or "CampusBite API").strip()


def app_version() -> str:
    return (os.getenv("APP_VERSION") or "1.0.0").strip()


def environment() -> str:
    return (os.getenv("ENVIRONMENT") or "development").strip()
