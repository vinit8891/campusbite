"""MongoDB Startup Indexing Engine.

Creates optimized indexes for orders, settlements, users, couriers, and canteens.
Idempotent and safe to run on every startup / deployment.
"""

from __future__ import annotations

from typing import Any
from pymongo.errors import OperationFailure

from app.core.logging import get_logger
from app.db.database import database

logger = get_logger(__name__)


async def _safe_create_index(col: Any, keys: Any, **kwargs: Any) -> None:
    """Safe index creation wrapper that logs and continues on failure."""
    if col is None:
        return
    try:
        await col.create_index(keys, **kwargs)
    except OperationFailure as exc:
        logger.warning(
            "Index creation skipped on %s for %s: %s",
            getattr(col, "name", "collection"),
            keys,
            exc,
        )
    except Exception as exc:
        logger.debug(
            "Index attempt note on %s for %s: %s",
            getattr(col, "name", "collection"),
            keys,
            exc,
        )


def _get_col(db_obj: Any, name: str) -> Any:
    if db_obj is None:
        return None
    if isinstance(db_obj, dict):
        return db_obj.get(name)
    if hasattr(db_obj, name):
        return getattr(db_obj, name)
    try:
        return db_obj[name]
    except Exception:
        return None


async def ensure_database_indexes(db: Any = None) -> None:
    """
    Ensure all critical production MongoDB indexes are created.
    Idempotent and safe to run on every app deploy or startup.
    """
    active_db = db if db is not None else database
    if active_db is None:
        return

    orders = _get_col(active_db, "orders")
    settlements = _get_col(active_db, "settlements")
    canteen_settlements = _get_col(active_db, "canteen_settlements")
    users = _get_col(active_db, "users")
    couriers = _get_col(active_db, "couriers")
    delivery_partners = _get_col(active_db, "delivery_partners")
    restaurants = _get_col(active_db, "restaurants")

    # 1. Orders collection: critical for active runs, tracking, and daily settlements
    if orders is not None:
        await _safe_create_index(orders, [("courier_id", 1), ("status", 1)])
        await _safe_create_index(orders, [("restaurant_id", 1), ("created_at", -1)])
        await _safe_create_index(orders, [("customer_id", 1), ("created_at", -1)])
        await _safe_create_index(orders, [("status", 1), ("created_at", -1)])
        await _safe_create_index(orders, [("razorpay_order_id", 1)], sparse=True)

    # 2. Settlements collection: quick lookup for vendor portal & admin sheets
    if settlements is not None:
        await _safe_create_index(settlements, [("restaurant_id", 1), ("date", -1)])
        await _safe_create_index(settlements, [("date", -1), ("status", 1)])
    if canteen_settlements is not None:
        await _safe_create_index(canteen_settlements, [("restaurant_id", 1), ("date", -1)])
        await _safe_create_index(canteen_settlements, [("date", -1), ("status", 1)])

    # 3. Couriers & Users: fast auth and phone/email uniqueness
    if users is not None:
        await _safe_create_index(users, [("email", 1)], unique=True, sparse=True)
    if couriers is not None:
        await _safe_create_index(couriers, [("user_id", 1)], unique=True, sparse=True)
        await _safe_create_index(couriers, [("is_locked", 1), ("is_active", 1)])
    if delivery_partners is not None:
        await _safe_create_index(delivery_partners, [("phone", 1)], unique=True, sparse=True)
        await _safe_create_index(delivery_partners, [("user_id", 1)], unique=True, sparse=True)
        await _safe_create_index(delivery_partners, [("is_locked", 1), ("is_active", 1)])
        await _safe_create_index(delivery_partners, [("verification_status", 1)])

    # 4. Canteens/Restaurants: slug lookup & open/closed sorting
    if restaurants is not None:
        await _safe_create_index(restaurants, [("slug", 1)], unique=True, sparse=True)
        await _safe_create_index(restaurants, [("is_accepting_orders", 1)])
        await _safe_create_index(restaurants, [("verification_status", 1)])

    logger.info("Database performance indexes successfully ensured")
