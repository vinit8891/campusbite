"""Production rate limiter utility using SlowAPI."""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def get_real_client_ip(request: Request) -> str:
    """Accurately extract client IP behind Render/Cloudflare reverse proxies."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request) or "127.0.0.1"


limiter = Limiter(key_func=get_real_client_ip, default_limits=["120/minute"])
