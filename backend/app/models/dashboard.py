from datetime import datetime, UTC

from app.db.database import database
from app.models.review import restaurant_average

order_collection = database["orders"]
menu_collection = database["menu"]
restaurant_collection = database["restaurants"]

ACTIVE_STATUSES = [
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Assigned",
    "Picked Up",
    "Out for Delivery",
]


def _start_of_today_utc() -> datetime:
    now = datetime.now(UTC)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def get_dashboard(email: str):
    """Restaurant owner dashboard stats. Preserves legacy keys."""
    base_filter = {"restaurant_email": email}

    total_orders = await order_collection.count_documents(base_filter)

    pending_orders = await order_collection.count_documents(
        {**base_filter, "status": "Pending"}
    )

    active_orders = await order_collection.count_documents(
        {**base_filter, "status": {"$in": ACTIVE_STATUSES}}
    )

    delivered_orders = await order_collection.count_documents(
        {**base_filter, "status": "Delivered"}
    )

    cancelled_orders = await order_collection.count_documents(
        {**base_filter, "status": "Cancelled"}
    )

    delivered_docs = await order_collection.find(
        {**base_filter, "status": "Delivered"}
    ).to_list(None)

    revenue = sum(float(order.get("total") or 0) for order in delivered_docs)

    today_start = _start_of_today_utc()

    today_orders = await order_collection.count_documents(
        {
            **base_filter,
            "created_at": {"$gte": today_start},
        }
    )

    today_delivered = await order_collection.find(
        {
            **base_filter,
            "status": "Delivered",
            "created_at": {"$gte": today_start},
        }
    ).to_list(None)

    today_revenue = sum(
        float(order.get("total") or 0) for order in today_delivered
    )

    menu_items = await menu_collection.count_documents(
        {"restaurant_email": email}
    )

    rating_data = await restaurant_average(email)
    rating = rating_data.get("rating") or 0
    review_count = rating_data.get("count") or 0

    # Fallback to restaurant listing rating when no reviews yet
    if not review_count:
        restaurant = await restaurant_collection.find_one({"email": email})
        if restaurant and restaurant.get("rating") is not None:
            try:
                rating = float(restaurant["rating"])
            except (TypeError, ValueError):
                rating = 0

    return {
        # Legacy fields (preserved)
        "orders": total_orders,
        "revenue": round(revenue, 2),
        "menu_items": menu_items,
        "rating": rating,
        # Extended statistics
        "pending_orders": pending_orders,
        "active_orders": active_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,
        "today_orders": today_orders,
        "today_revenue": round(today_revenue, 2),
        "review_count": review_count,
    }
