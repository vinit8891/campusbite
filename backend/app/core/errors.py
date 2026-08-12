"""Consistent API error responses and exception helpers."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger
from app.core.request_id import get_request_id

logger = get_logger(__name__)


def error_payload(detail: Any, *, success: bool = False, request_id: str | None = None) -> dict:
    """Build a consistent JSON error body without altering success responses."""
    body = {
        "detail": detail,
        "success": success,
    }
    if request_id:
        body["request_id"] = request_id
    return body


def http_error(
    status_code: int,
    detail: str,
) -> HTTPException:
    """Raise a standard HTTPException (response shaped by global handlers)."""
    return HTTPException(status_code=status_code, detail=detail)


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    logger.warning(
        "Handled HTTPException path=%s method=%s status=%s",
        request.url.path,
        request.method,
        exc.status_code,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(exc.detail, request_id=get_request_id(request)),
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    logger.warning(
        "Request validation failed path=%s method=%s",
        request.url.path,
        request.method,
    )
    return JSONResponse(
        status_code=422,
        content=error_payload(exc.errors(), request_id=get_request_id(request)),
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.exception(
        "Unhandled exception path=%s method=%s",
        request.url.path,
        request.method,
    )
    return JSONResponse(
        status_code=500,
        content=error_payload(
            "Internal server error",
            request_id=get_request_id(request),
        ),
    )
