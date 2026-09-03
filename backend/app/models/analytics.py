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


async def get_admin_financial_analytics() -> dict:
    """
    Computes platform-wide aggregated financial metrics from all delivered orders.
    Calculates GMV (gross revenue), net app earnings, completed orders,
    restaurant settlements, courier payouts, and statutory GST pool.
    """
    delivered_query = {
        "$or": [
            {"status": {"$in": ["Delivered", "delivered"]}},
            {"order_status": {"$in": ["Delivered", "delivered"]}},
        ]
    }

    total_revenue = 0.0
    platform_earnings = 0.0
    restaurant_settlements = 0.0
    courier_payouts = 0.0
    gst_pool = 0.0
    total_orders = 0

    async for doc in order_collection.find(delivered_query):
        total_orders += 1
        order_total = float(
            doc.get("total")
            if doc.get("total") is not None
            else (doc.get("grand_total") or 0.0)
        )
        items = doc.get("items") or []

        # Food subtotal
        if doc.get("food_subtotal") is not None:
            subtotal = float(doc.get("food_subtotal") or 0.0)
        elif items:
            subtotal = sum(
                float(it.get("price", 0)) * int(it.get("quantity", 1))
                for it in items
            )
        else:
            subtotal = (
                max(0.0, (order_total - 18.0) / 1.05)
                if order_total > 18
                else order_total
            )

        # Commission
        if doc.get("commission_amount") is not None:
            comm = float(doc.get("commission_amount") or 0.0)
        elif items:
            comm = sum(
                float(it.get("price", 0))
                * int(it.get("quantity", 1))
                * (0.05 if it.get("is_budget_meal") else 0.10)
                for it in items
            )
        else:
            comm = round(0.05 * subtotal, 2)

        # Platform fee
        if doc.get("platform_fee") is not None:
            p_fee = float(doc.get("platform_fee") or 0.0)
        else:
            p_fee = 3.00 if subtotal <= 100.0 else 5.00
            if order_total <= 0:
                p_fee = 0.0

        # Delivery fee
        if doc.get("delivery_fee") is not None:
            d_fee = float(doc.get("delivery_fee") or 0.0)
        else:
            d_fee = 15.00 if order_total > 0 else 0.0

        # GST (5%)
        if doc.get("restaurant_gst") is not None:
            gst = float(doc.get("restaurant_gst") or 0.0)
        elif doc.get("gst") is not None:
            gst = float(doc.get("gst") or 0.0)
        else:
            gst = round(0.05 * subtotal, 2)

        # Restaurant settlement: subtotal minus commission
        settlement = max(0.0, subtotal - comm)

        total_revenue += order_total
        platform_earnings += p_fee + comm
        restaurant_settlements += settlement
        courier_payouts += d_fee
        gst_pool += gst

    average_order_value = (
        round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0
    )

    return {
        "total_revenue": round(total_revenue, 2),
        "platform_earnings": round(platform_earnings, 2),
        "total_orders": total_orders,
        "restaurant_settlements": round(restaurant_settlements, 2),
        "courier_payouts": round(courier_payouts, 2),
        "gst_pool": round(gst_pool, 2),
        "average_order_value": average_order_value,
    }
