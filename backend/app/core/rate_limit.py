"""Lightweight in-memory rate limiting for sensitive endpoints."""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from app.core.request_id import get_request_id
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# path prefix or exact path -> (methods, limit per minute)
AUTH_LIMIT = 5
PAYMENT_LIMIT = 10
OTP_LIMIT = 5
WINDOW_SECONDS = 60

AUTH_ROUTES: dict[str, frozenset[str]] = {
    "/auth/login": frozenset({"POST"}),
    "/auth/admin/login": frozenset({"POST"}),
    "/restaurant-owner/login": frozenset({"POST"}),
    "/delivery/login": frozenset({"POST"}),
}

PAYMENT_ROUTES: dict[str, frozenset[str]] = {
    "/payments/razorpay/create": frozenset({"POST"}),
    "/payments/razorpay/verify": frozenset({"POST"}),
    "/payments/refunds": frozenset({"POST"}),
}

OTP_ROUTE_PREFIXES = (
    "/orders/otp/",
    "/orders/verify-otp/",
)

WEBHOOK_PATH = "/payments/razorpay/webhook"


class _InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def allow(self, key: str, limit: int, window: int = WINDOW_SECONDS) -> bool:
        now = time.time()
        cutoff = now - window
        with self._lock:
            bucket = [t for t in self._hits[key] if t > cutoff]
            if len(bucket) >= limit:
                self._hits[key] = bucket
                return False
            bucket.append(now)
            self._hits[key] = bucket
            return True


_limiter = _InMemoryRateLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _route_limit(path: str, method: str) -> int | None:
    if path == WEBHOOK_PATH:
        return None

    methods = AUTH_ROUTES.get(path)
    if methods and method in methods:
        return AUTH_LIMIT

    methods = PAYMENT_ROUTES.get(path)
    if methods and method in methods:
        return PAYMENT_LIMIT

    for prefix in OTP_ROUTE_PREFIXES:
        if path.startswith(prefix) and method in {"GET", "PUT", "POST"}:
            return OTP_LIMIT

    return None


def check_rate_limit(request: Request) -> Response | None:
    """Return a 429 response when the client exceeds the route limit."""
    path = request.url.path
    method = request.method.upper()
    limit = _route_limit(path, method)
    if limit is None:
        return None

    ip = client_ip(request)
    bucket_key = f"{path}:{method}:{ip}"
    if _limiter.allow(bucket_key, limit):
        return None

    body = {"detail": "Too many requests. Please try again later."}
    request_id = get_request_id(request)
    if request_id:
        body["request_id"] = request_id

    return JSONResponse(
        status_code=429,
        content=body,
        headers={"Retry-After": str(WINDOW_SECONDS)},
    )


def active_rate_limit_entries() -> int:
    """Count rate-limit buckets with at least one hit in the current window."""
    now = time.time()
    cutoff = now - WINDOW_SECONDS
    with _limiter._lock:
        active = 0
        for hits in _limiter._hits.values():
            if any(t > cutoff for t in hits):
                active += 1
        return active
