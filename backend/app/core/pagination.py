"""Shared pagination helpers for list APIs."""

from __future__ import annotations

import math
from typing import Any


DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def normalize_page(page: int | None) -> int:
    try:
        value = int(page or 1)
    except (TypeError, ValueError):
        value = 1
    return max(1, value)


def normalize_limit(
    limit: int | None,
    *,
    default: int = DEFAULT_LIMIT,
    maximum: int = MAX_LIMIT,
) -> int:
    try:
        value = int(limit if limit is not None else default)
    except (TypeError, ValueError):
        value = default
    return max(1, min(value, maximum))


def paginate_meta(total: int, page: int, limit: int) -> dict[str, int]:
    safe_total = max(0, int(total or 0))
    pages = max(1, math.ceil(safe_total / limit)) if safe_total else 1
    safe_page = min(max(1, page), pages)
    return {
        "page": safe_page,
        "limit": limit,
        "total": safe_total,
        "pages": pages,
    }


def paginated_response(items: list[Any], *, total: int, page: int, limit: int) -> dict:
    meta = paginate_meta(total, page, limit)
    return {
        "items": items,
        **meta,
    }


def skip_for(page: int, limit: int) -> int:
    return (max(1, page) - 1) * limit
