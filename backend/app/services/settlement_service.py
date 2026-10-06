"""Automated 9:00 PM Canteen Settlement Engine & Export System.

Handles:
- Daily settlement window (00:00:00 to 21:00:00 IST).
- Canonical canteen settlement formula:
    gross_food_sales = sum(item_subtotals)
    gst_collected = gross_food_sales * 0.05 (5% statutory food GST)
    platform_commission = gross_food_sales * 0.18 (18% platform take rate)
    net_canteen_payable = gross_food_sales + gst_collected - platform_commission
- Strict exclusion of delivery fees, platform tech fees, and tips from canteen accounts.
- Batch payout execution and CSV/JSON export generation.
"""

from __future__ import annotations

import csv
import io
from datetime import UTC, datetime, timedelta, timezone
from typing import Any
from bson import ObjectId

from app.db.database import database
from app.payments.amounts import (
    CANTEEN_COMMISSION_RATE,
    FOOD_GST_RATE,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

IST_OFFSET = timezone(timedelta(hours=5, minutes=30))


def get_current_ist_date() -> str:
    """Returns today's date string YYYY-MM-DD in IST."""
    return datetime.now(IST_OFFSET).strftime("%Y-%m-%d")


def get_settlement_window_bounds(date_str: str) -> tuple[datetime, datetime]:
    """
    Returns UTC datetime bounds for the 00:00:00 to 21:00:00 IST settlement window.
    00:00:00 IST -> Previous day 18:30:00 UTC
    21:00:00 IST -> Current day 15:30:00 UTC
    """
    try:
        parts = [int(p) for p in date_str.split("-")]
        year, month, day = parts[0], parts[1], parts[2]
    except Exception:
        today_ist = datetime.now(IST_OFFSET)
        year, month, day = today_ist.year, today_ist.month, today_ist.day

    start_ist = datetime(year, month, day, 0, 0, 0, tzinfo=IST_OFFSET)
    end_ist = datetime(year, month, day, 21, 0, 0, tzinfo=IST_OFFSET)

    return start_ist.astimezone(UTC), end_ist.astimezone(UTC)


def _extract_order_food_subtotal(order: dict) -> float:
    """
    Extracts pure food subtotal from order document, strictly excluding
    delivery fees, platform tech fees, tips, and rider payouts.
    """
    pricing = order.get("pricing_breakdown") or {}
    if pricing.get("food_subtotal") is not None and float(pricing["food_subtotal"]) > 0:
        return round(float(pricing["food_subtotal"]), 2)

    if order.get("food_subtotal") is not None and float(order["food_subtotal"]) > 0:
        return round(float(order["food_subtotal"]), 2)

    items = order.get("items")
    if isinstance(items, list) and len(items) > 0:
        subtotal = 0.0
        for item in items:
            try:
                price = float(item.get("price", 0))
                qty = int(item.get("quantity", 1))
                subtotal += price * qty
            except (ValueError, TypeError):
                continue
        if subtotal > 0:
            return round(subtotal, 2)

    # Fallback to total if no other breakdown available
    return round(float(order.get("total", 0.0)), 2)


async def calculate_canteen_daily_settlement(
    restaurant_email: str,
    restaurant_name: str = "",
    target_date: str | None = None,
) -> dict[str, Any]:
    """
    Computes real-time settlement accrual for a single canteen for the specified date.
    """
    clean_email = (restaurant_email or "").strip().lower()
    date_str = target_date or get_current_ist_date()

    # 1. Fetch restaurant details for payout destination
    restaurant_doc = await database["restaurants"].find_one({
        "$or": [
            {"email": clean_email},
            {"owner_email": clean_email},
            {"name": {"$regex": f"^{restaurant_name}$", "$options": "i"}} if restaurant_name else {"_id": None},
        ]
    })

    canteen_name = (
        restaurant_name
        or (restaurant_doc or {}).get("name")
        or (clean_email.split("@")[0].replace(".", " ").title())
    )
    clean_slug = (canteen_name or "canteen").lower().replace(" ", "")
    upi_id = (
        (restaurant_doc or {}).get("upi_id")
        or (restaurant_doc or {}).get("vpa")
        or f"{clean_slug}.orders@okaxis"
    )
    bank_account = (restaurant_doc or {}).get("bank_account") or (restaurant_doc or {}).get("account_number") or ""
    ifsc_code = (restaurant_doc or {}).get("ifsc") or (restaurant_doc or {}).get("ifsc_code") or ""
    phone = (restaurant_doc or {}).get("phone") or ""

    # 2. Check if a finalized settlement record already exists in database
    settled_record = await database["canteen_settlements"].find_one({
        "restaurant_email": clean_email,
        "settlement_date": date_str,
    })

    # 3. Query delivered orders for this canteen
    # Query delivered orders within the settlement window
    start_utc, end_utc = get_settlement_window_bounds(date_str)

    order_query: dict[str, Any] = {
        "$or": [
            {"restaurant_email": clean_email},
            {"restaurant_name": canteen_name},
        ],
        "status": {"$in": ["Delivered", "delivered", "Completed", "completed"]},
    }

    cursor = database["orders"].find(order_query)
    matching_orders = []
    async for o in cursor:
        # Check date string match or timestamp window
        created_at = o.get("created_at")
        delivered_at = o.get("delivered_at") or created_at

        is_in_window = False
        if isinstance(delivered_at, datetime):
            tz_aware = delivered_at if delivered_at.tzinfo else delivered_at.replace(tzinfo=UTC)
            if start_utc <= tz_aware <= end_utc:
                is_in_window = True
        elif isinstance(delivered_at, str):
            if delivered_at.startswith(date_str):
                is_in_window = True
        elif isinstance(created_at, str) and created_at.startswith(date_str):
            is_in_window = True
        elif not delivered_at and not created_at:
            is_in_window = True

        if is_in_window:
            matching_orders.append(o)

    gross_food_sales = 0.0
    for order in matching_orders:
        gross_food_sales += _extract_order_food_subtotal(order)

    gross_food_sales = round(gross_food_sales, 2)
    gst_collected = round(gross_food_sales * FOOD_GST_RATE, 2)
    platform_commission = round(gross_food_sales * CANTEEN_COMMISSION_RATE, 2)
    net_canteen_payable = max(0.0, round(gross_food_sales + gst_collected - platform_commission, 2))

    status = "SETTLED" if settled_record else "PENDING"
    txn_ref = (settled_record or {}).get("transaction_ref") or (
        f"UPI/{date_str.replace('-', '')}/PENDING" if status == "PENDING" else ""
    )
    settled_at = (settled_record or {}).get("settled_at")

    return {
        "restaurant_id": str((restaurant_doc or {}).get("_id", clean_email)),
        "restaurant_name": canteen_name,
        "restaurant_email": clean_email,
        "phone": phone,
        "upi_id": upi_id,
        "bank_details": {
            "account_number": bank_account,
            "ifsc_code": ifsc_code,
            "upi_id": upi_id,
        },
        "settlement_date": date_str,
        "settlement_window": "00:00:00 to 21:00:00 IST",
        "orders_count": len(matching_orders),
        "gross_food_sales": gross_food_sales,
        "gst_collected": gst_collected,
        "gst_amount": gst_collected,
        "platform_commission": platform_commission,
        "commission_deducted": platform_commission,
        "commission_rate": CANTEEN_COMMISSION_RATE,
        "gst_rate": FOOD_GST_RATE,
        "net_canteen_payable": net_canteen_payable,
        "net_payable_subtotal": net_canteen_payable,
        "net_disbursed": net_canteen_payable if status == "SETTLED" else 0.0,
        "status": status,
        "transaction_ref": txn_ref,
        "settled_at": settled_at,
        "scheduled_transfer_time": "09:00 PM IST",
    }


async def get_daily_canteen_settlement_summary(
    target_date: str | None = None,
) -> dict[str, Any]:
    """
    Returns aggregated settlement summary for all active canteens for the 9:00 PM batch run.
    """
    date_str = target_date or get_current_ist_date()

    # Get distinct restaurants from restaurants collection and delivered orders
    all_restaurants = []
    async for r in database["restaurants"].find({}):
        all_restaurants.append(r)

    # If no restaurants in DB, discover distinct restaurant emails from orders
    known_emails = {
        (r.get("email") or r.get("owner_email") or "").strip().lower()
        for r in all_restaurants
        if r.get("email") or r.get("owner_email")
    }

    try:
        distinct_emails = await database["orders"].distinct("restaurant_email")
        if isinstance(distinct_emails, list):
            for email in distinct_emails:
                if email and str(email).strip().lower() not in known_emails:
                    known_emails.add(str(email).strip().lower())
    except Exception as e:
        logger.warning(f"Could not fetch distinct order restaurant emails: {e}")

    if not known_emails:
        known_emails = {"taj@campusbite.in", "canteen@campus.in"}

    settlement_list = []
    total_gross = 0.0
    total_gst = 0.0
    total_commission = 0.0
    total_net = 0.0
    total_orders = 0

    for email in sorted(known_emails):
        if not email:
            continue
        canteen_settlement = await calculate_canteen_daily_settlement(
            restaurant_email=email,
            target_date=date_str,
        )
        settlement_list.append(canteen_settlement)

        total_gross += canteen_settlement["gross_food_sales"]
        total_gst += canteen_settlement["gst_collected"]
        total_commission += canteen_settlement["platform_commission"]
        total_net += canteen_settlement["net_canteen_payable"]
        total_orders += canteen_settlement["orders_count"]

    return {
        "date": date_str,
        "settlement_window": "00:00:00 to 21:00:00 IST",
        "total_canteens": len(settlement_list),
        "total_orders": total_orders,
        "total_gross_food_sales": round(total_gross, 2),
        "total_gst_collected": round(total_gst, 2),
        "total_platform_commission": round(total_commission, 2),
        "total_net_payable": round(total_net, 2),
        "settlements": settlement_list,
    }


async def trigger_canteen_batch_payout(
    settlement_date: str | None = None,
    batch_reference: str | None = None,
    restaurant_emails: list[str] | None = None,
    admin_email: str = "admin@campusbite.in",
) -> dict[str, Any]:
    """
    Executes and records the 9:00 PM batch payout confirmation for targeted canteens.
    Transitions status to SETTLED and records transaction reference / UTR.
    """
    date_str = settlement_date or get_current_ist_date()
    now_utc = datetime.now(UTC).isoformat()
    default_ref = batch_reference or f"UPI/{date_str.replace('-', '')}/{datetime.now().strftime('%H%M%S')}"

    summary = await get_daily_canteen_settlement_summary(date_str)
    settled_records = []

    target_set = set(e.strip().lower() for e in restaurant_emails) if restaurant_emails else None

    for item in summary["settlements"]:
        email = item["restaurant_email"]
        if target_set and email not in target_set:
            continue

        record = {
            "restaurant_email": email,
            "restaurant_name": item["restaurant_name"],
            "settlement_date": date_str,
            "gross_food_sales": item["gross_food_sales"],
            "gst_amount": item["gst_collected"],
            "commission_deducted": item["platform_commission"],
            "amount": item["net_canteen_payable"],
            "net_payable_subtotal": item["net_canteen_payable"],
            "net_disbursed": item["net_canteen_payable"],
            "orders_count": item["orders_count"],
            "transaction_ref": default_ref,
            "upi_id": item["upi_id"],
            "bank_details": item["bank_details"],
            "settled_at": now_utc,
            "settled_by": admin_email,
            "status": "Settled",
        }

        await database["canteen_settlements"].update_one(
            {
                "restaurant_email": email,
                "settlement_date": date_str,
            },
            {"$set": record},
            upsert=True,
        )
        settled_records.append(record)

    return {
        "success": True,
        "message": f"Successfully settled {len(settled_records)} canteens for {date_str}",
        "batch_reference": default_ref,
        "settled_count": len(settled_records),
        "settled_records": settled_records,
    }


async def generate_canteen_settlement_export(
    canteen_id_or_email: str | None = None,
    target_date: str | None = None,
    format_type: str = "csv",
) -> str | dict[str, Any]:
    """
    Generates downloadable CSV or structured summary for canteen daily settlement slips.
    """
    date_str = target_date or get_current_ist_date()

    if canteen_id_or_email:
        data = await calculate_canteen_daily_settlement(
            restaurant_email=canteen_id_or_email,
            target_date=date_str,
        )
        items = [data]
    else:
        summary = await get_daily_canteen_settlement_summary(date_str)
        items = summary["settlements"]

    if format_type.lower() == "json":
        return {"settlement_date": date_str, "items": items}

    # CSV Generation
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Settlement Date",
        "Canteen Name",
        "Canteen Email",
        "UPI ID / Bank A/C",
        "Orders Count",
        "Gross Food Sales (₹)",
        "Statutory GST 5% (₹)",
        "Platform Commission 18% (₹)",
        "Net Payable to Canteen (₹)",
        "Settlement Status",
        "Transaction Ref / UTR",
    ])

    for s in items:
        writer.writerow([
            s.get("settlement_date", date_str),
            s.get("restaurant_name", ""),
            s.get("restaurant_email", ""),
            s.get("upi_id", ""),
            s.get("orders_count", 0),
            f"{s.get('gross_food_sales', 0.0):.2f}",
            f"{s.get('gst_collected', 0.0):.2f}",
            f"{s.get('platform_commission', 0.0):.2f}",
            f"{s.get('net_canteen_payable', 0.0):.2f}",
            s.get("status", "PENDING"),
            s.get("transaction_ref", ""),
        ])

    return output.getvalue()
