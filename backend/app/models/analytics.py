from collections import Counter
from datetime import datetime, timedelta, UTC

from app.db.database import database
from app.models.review import restaurant_average

order_collection = database["orders"]
review_collection = database["reviews"]


async def best_selling_foods(email: str):
    foods = Counter()

    async for order in order_collection.find(
        {
            "restaurant_email": email,
            "status": "Delivered",
        }
    ):
        for item in order.get("items") or []:
            name = item.get("name")
            if not name:
                continue
            foods[name] += int(item.get("quantity") or 0)

    result = []
    for name, quantity in foods.most_common(5):
        result.append(
            {
                "name": name,
                "orders": quantity,
            }
        )

    return result


def _start_of_day_utc(days_ago: int = 0) -> datetime:
    now = datetime.now(UTC)
    day = now - timedelta(days=days_ago)
    return day.replace(hour=0, minute=0, second=0, microsecond=0)


def _normalize_payment_method(value) -> str:
    if not value:
        return "cod"
    key = str(value).strip().lower().replace("-", "_").replace(" ", "_")
    if key in {"cod", "cash_on_delivery", "cashondelivery", "cash"} or "cash" in key:
        return "cod"
    if key in {"online", "online_payment", "razorpay", "upi", "card"} or "online" in key:
        return "online"
    return key or "unknown"


async def _count_by_field(email: str, field: str) -> list[dict]:
    pipeline = [
        {"$match": {"restaurant_email": email}},
        {
            "$group": {
                "_id": f"${field}",
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
    ]

    rows = await order_collection.aggregate(pipeline).to_list(None)
    results = []

    for row in rows:
        raw = row.get("_id")
        if field == "payment_method":
            label = _normalize_payment_method(raw)
        elif field == "payment_status":
            label = str(raw or "pending")
        else:
            label = str(raw or "Unknown")

        results.append({"key": label, "count": int(row.get("count") or 0)})

    # Merge normalized payment methods that collapsed to same key
    if field == "payment_method":
        merged: Counter[str] = Counter()
        for item in results:
            merged[item["key"]] += item["count"]
        results = [
            {"key": key, "count": count}
            for key, count in merged.most_common()
        ]

    return results


async def _revenue_since(email: str, since: datetime) -> float:
    pipeline = [
        {
            "$match": {
                "restaurant_email": email,
                "status": "Delivered",
                "created_at": {"$gte": since},
            }
        },
        {
            "$group": {
                "_id": None,
                "revenue": {"$sum": "$total"},
            }
        },
    ]
    rows = await order_collection.aggregate(pipeline).to_list(length=1)
    if not rows:
        return 0.0
    return round(float(rows[0].get("revenue") or 0), 2)


async def _revenue_trend(email: str, days: int = 7) -> list[dict]:
    since = _start_of_day_utc(days - 1)

    pipeline = [
        {
            "$match": {
                "restaurant_email": email,
                "status": "Delivered",
                "created_at": {"$gte": since},
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$created_at",
                    }
                },
                "revenue": {"$sum": "$total"},
                "orders": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    rows = await order_collection.aggregate(pipeline).to_list(None)
    by_day = {
        row["_id"]: {
            "revenue": round(float(row.get("revenue") or 0), 2),
            "orders": int(row.get("orders") or 0),
        }
        for row in rows
        if row.get("_id")
    }

    trend = []
    for offset in range(days - 1, -1, -1):
        day = _start_of_day_utc(offset)
        key = day.strftime("%Y-%m-%d")
        point = by_day.get(key, {"revenue": 0.0, "orders": 0})
        trend.append(
            {
                "date": key,
                "revenue": point["revenue"],
                "orders": point["orders"],
            }
        )

    return trend


async def _recent_reviews(email: str, limit: int = 5) -> list[dict]:
    reviews = []
    cursor = (
        review_collection.find({"restaurant_email": email})
        .sort("_id", -1)
        .limit(limit)
    )

    async for review in cursor:
        reviews.append(
            {
                "id": str(review.get("_id")),
                "customer_name": review.get("customer_name") or "Customer",
                "rating": int(review.get("rating") or 0),
                "review": review.get("review") or "",
            }
        )

    return reviews


async def get_restaurant_overview(email: str) -> dict:
    """Read-only restaurant analytics overview."""
    orders_by_status = await _count_by_field(email, "status")
    orders_by_payment_method = await _count_by_field(email, "payment_method")
    orders_by_payment_status = await _count_by_field(email, "payment_status")

    revenue_last_7_days = await _revenue_since(email, _start_of_day_utc(6))
    revenue_last_30_days = await _revenue_since(email, _start_of_day_utc(29))
    revenue_trend_7d = await _revenue_trend(email, days=7)

    top_selling_items = await best_selling_foods(email)

    delivered_docs = await order_collection.find(
        {"restaurant_email": email, "status": "Delivered"}
    ).to_list(None)

    delivered_count = len(delivered_docs)
    total_revenue = sum(float(order.get("total") or 0) for order in delivered_docs)
    average_order_value = (
        round(total_revenue / delivered_count, 2) if delivered_count else 0.0
    )

    rating_data = await restaurant_average(email)
    recent_reviews = await _recent_reviews(email, limit=5)

    return {
        "orders_by_status": orders_by_status,
        "orders_by_payment_method": orders_by_payment_method,
        "orders_by_payment_status": orders_by_payment_status,
        "revenue_last_7_days": revenue_last_7_days,
        "revenue_last_30_days": revenue_last_30_days,
        "revenue_trend_7d": revenue_trend_7d,
        "top_selling_items": top_selling_items,
        "recent_reviews": recent_reviews,
        "reviews_summary": {
            "average_rating": rating_data.get("rating") or 0,
            "count": rating_data.get("count") or 0,
        },
        "average_order_value": average_order_value,
    }
