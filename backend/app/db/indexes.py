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
    audit_logs = database["admin_audit_logs"]
    notification_logs = database["notification_logs"]
    subscriptions = database["subscriptions"]
    subscription_plans = database["subscription_plans"]
    subscription_payments = database["subscription_payments"]

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
    await _safe_create_index(orders, "subscription_id", sparse=True)
    await _safe_create_index(
        orders,
        [("subscription_id", 1), ("subscription_order_date", 1)],
        unique=True,
        sparse=True,
    )
    await _safe_create_index(orders, "generated_by", sparse=True)

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

    # admin audit logs
    await _safe_create_index(audit_logs, [("timestamp", -1)])
    await _safe_create_index(audit_logs, "admin_email")
    await _safe_create_index(audit_logs, "action")

    # notification logs
    await _safe_create_index(notification_logs, [("created_at", -1)])
    await _safe_create_index(notification_logs, "recipient")
    await _safe_create_index(notification_logs, "type")
    await _safe_create_index(notification_logs, "status")
    await _safe_create_index(notification_logs, "customer_id", sparse=True)

    # subscriptions
    await _safe_create_index(subscriptions, "customer_email")
    await _safe_create_index(subscriptions, "restaurant_email")
    await _safe_create_index(subscriptions, "status")
    await _safe_create_index(subscriptions, [("start_date", 1), ("end_date", 1)])
    await _safe_create_index(
        subscriptions,
        [("customer_email", 1), ("status", 1), ("created_at", -1)],
    )
    await _safe_create_index(
        subscriptions,
        [("restaurant_email", 1), ("status", 1), ("created_at", -1)],
    )
    await _safe_create_index(subscriptions, "plan_id", sparse=True)

    # subscription plans
    await _safe_create_index(subscription_plans, "restaurant_email")
    await _safe_create_index(subscription_plans, "active")
    await _safe_create_index(
        subscription_plans,
        [("restaurant_email", 1), ("active", 1), ("created_at", -1)],
    )

    # subscription payments
    await _safe_create_index(subscription_payments, "subscription_id")
    await _safe_create_index(subscription_payments, "customer_email")
    await _safe_create_index(subscription_payments, "restaurant_email")
    await _safe_create_index(subscription_payments, "payment_status")
    await _safe_create_index(subscription_payments, [("created_at", -1)])
    await _safe_create_index(
        subscription_payments,
        [("customer_email", 1), ("created_at", -1)],
    )
    await _safe_create_index(
        subscription_payments,
        [("restaurant_email", 1), ("created_at", -1)],
    )
    await _safe_create_index(
        subscription_payments,
        "transaction_reference",
        unique=True,
        sparse=True,
    )
    await _safe_create_index(
        subscription_payments,
        "razorpay_order_id",
        unique=True,
        sparse=True,
    )
    await _safe_create_index(
        subscription_payments,
        "razorpay_payment_id",
        unique=True,
        sparse=True,
    )
    await _safe_create_index(
        subscription_payments,
        [("subscription_id", 1), ("billing_period", 1)],
        unique=True,
        partialFilterExpression={
            "payment_status": {"$in": ["pending", "processing", "paid"]},
        },
    )

    logger.info("MongoDB indexes ensured")
