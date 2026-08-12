"""Input normalization helpers (trim / safe defaults; no request-shape changes)."""

from __future__ import annotations

import re

_MAX_SEARCH_LEN = 200
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def sanitize_email(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def sanitize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^\d+]", "", value.strip())
    return cleaned or None


def sanitize_search_query(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    if not cleaned:
        return None
    if len(cleaned) > _MAX_SEARCH_LEN:
        cleaned = cleaned[:_MAX_SEARCH_LEN]
    return cleaned


def is_plausible_email(value: str | None) -> bool:
    if not value:
        return False
    return bool(_EMAIL_RE.match(value.strip()))
