"""Safe request logging middleware (no secrets / personal payloads)."""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger
from app.core.metrics import record_request
from app.core.request_id import get_request_id

logger = get_logger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        method = request.method
        request_id = get_request_id(request)
        started = time.perf_counter()

        logger.info(
            "request received request_id=%s method=%s path=%s",
            request_id,
            method,
            path,
        )

        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = (time.perf_counter() - started) * 1000
            record_request(method=method, path=path, duration_ms=elapsed_ms)
            logger.exception(
                "request failed request_id=%s method=%s path=%s duration_ms=%.1f",
                request_id,
                method,
                path,
                elapsed_ms,
            )
            raise

        elapsed_ms = (time.perf_counter() - started) * 1000
        record_request(method=method, path=path, duration_ms=elapsed_ms)
        logger.info(
            "request completed request_id=%s method=%s path=%s status=%s duration_ms=%.1f",
            request_id,
            method,
            path,
            response.status_code,
            elapsed_ms,
        )
        return response
