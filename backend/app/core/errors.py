"""Consistent API error responses and exception helpers."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)


def error_payload(detail: Any, *, success: bool = False) -> dict:
    """Build a consistent JSON error body without altering success responses."""
    return {
        "detail": detail,
        "success": success,
    }


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
        content=error_payload(exc.detail),
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
        content=error_payload(exc.errors()),
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
        content=error_payload("Internal server error"),
    )
