"""Create beneficial MongoDB indexes (idempotent via create_index)."""

from __future__ import annotations

from pymongo.errors import OperationFailure

from app.core.logging import get_logger
from app.db.database import database
from app.models.payment import ensure_payment_indexes

logger = get_logger(__name__)


async def _safe_create_index(collection, keys, **kwargs) -> None:
    """create_index is idempotent; log and continue if an index cannot be created."""
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as exc:
        logger.warning(
            "Index skipped on %s (%s): %s",
            collection.name,
            keys,
            exc,
        )


async def ensure_app_indexes() -> None:
    """
    Ensure indexes for major collections.
    Safe to call repeatedly — create_index is idempotent.
    Does not drop existing indexes.
    """
    users = database["users"]
    restaurants = database["restaurants"]
    restaurant_owners = database["restaurant_owners"]
    delivery_partners = database["delivery_partners"]
    orders = database["orders"]
    menu = database["menu"]
    reviews = database["reviews"]
    payments = database["payments"]
    refunds = database["refunds"]

    # users
    await _safe_create_index(users, "email", unique=True, sparse=True)
    await _safe_create_index(users, "phone", sparse=True)
    await _safe_create_index(users, "created_at")

    # restaurants
    await _safe_create_index(restaurants, "email", unique=True, sparse=True)
    await _safe_create_index(restaurants, "slug", unique=True, sparse=True)
    await _safe_create_index(restaurants, "cuisine")
    await _safe_create_index(restaurants, "name")

    # restaurant owners
    await _safe_create_index(restaurant_owners, "email", unique=True, sparse=True)
    await _safe_create_index(restaurant_owners, "phone", sparse=True)

    # delivery partners
    await _safe_create_index(delivery_partners, "email", unique=True, sparse=True)
    await _safe_create_index(delivery_partners, "phone", unique=True, sparse=True)
    await _safe_create_index(delivery_partners, "online")

    # orders
    await _safe_create_index(orders, [("created_at", -1)])
    await _safe_create_index(orders, "restaurant_email")
    await _safe_create_index(orders, "customer_email")
    await _safe_create_index(orders, "customer_id")
    await _safe_create_index(orders, "phone")
    await _safe_create_index(orders, "delivery_partner.phone")
    await _safe_create_index(orders, "status")
    await _safe_create_index(orders, "payment_status")
    await _safe_create_index(orders, "payment_method")
    await _safe_create_index(orders, [("status", 1), ("created_at", -1)])
    await _safe_create_index(
        orders,
        [("delivery_partner.phone", 1), ("status", 1), ("delivered_at", -1)],
    )

    # menu
    await _safe_create_index(menu, "restaurant_email")
    await _safe_create_index(menu, "category")
    await _safe_create_index(menu, "available")
    await _safe_create_index(menu, [("restaurant_email", 1), ("available", 1)])

    # reviews
    await _safe_create_index(reviews, "restaurant_email")
    await _safe_create_index(reviews, "order_id", sparse=True)
    await _safe_create_index(reviews, "delivery_partner_phone", sparse=True)

    # payments / refunds (extend existing ensure_payment_indexes)
    await ensure_payment_indexes()
    await _safe_create_index(payments, "razorpay_payment_id", sparse=True)
    await _safe_create_index(refunds, "refund_id", sparse=True)

    logger.info("MongoDB indexes ensured")
