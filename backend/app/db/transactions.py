"""MongoDB transaction helper with standalone fallback."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from pymongo.errors import OperationFailure

from app.core.logging import get_logger
from app.db.database import client

logger = get_logger(__name__)

T = TypeVar("T")

_TRANSACTION_UNSUPPORTED_MARKERS = (
    "Transaction numbers are only allowed",
    "replica set member",
    "mongos",
)


def _transaction_unsupported(exc: OperationFailure) -> bool:
    message = str(exc).lower()
    return any(marker.lower() in message for marker in _TRANSACTION_UNSUPPORTED_MARKERS)


async def run_optional_transaction(
    callback: Callable[[Any | None], Awaitable[T]],
) -> T:
    """
    Run callback inside a MongoDB transaction when supported.
    Falls back to callback(None) on standalone instances.
    """
    try:
        async with await client.start_session() as session:
            try:
                async with session.start_transaction():
                    return await callback(session)
            except OperationFailure as exc:
                if _transaction_unsupported(exc):
                    logger.info(
                        "MongoDB transactions unavailable; using compensating updates"
                    )
                    return await callback(None)
                raise
    except OperationFailure as exc:
        if _transaction_unsupported(exc):
            logger.info(
                "MongoDB transactions unavailable; using compensating updates"
            )
            return await callback(None)
        raise
