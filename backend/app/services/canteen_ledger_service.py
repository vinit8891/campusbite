"""Daily 9:00 PM EOD Canteen Ledger & Bi-Weekly (Tue/Fri) Settlement Engine.

Handles:
- Settlement cycle grouping:
    Monday, Tuesday, Wednesday -> Friday payout
    Thursday, Friday, Saturday, Sunday -> following Tuesday payout
- Daily 9:00 PM EOD ledger generation & MongoDB persistence (`daily_canteen_ledgers`)
- 18.0% standard take rate calculation:
    gross_food_sales = sum(pure_food_subtotals)
    commission_rate = 0.18
    commission_amount = round(gross_food_sales * 0.18, 2)
    net_payout_accrued = round(gross_food_sales - commission_amount, 2)
- Upcoming bi-weekly disbursal balances & bank clearance status
- Admin batch payout settlement recording with UTR/UPI reference ID.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any, Optional
from bson import ObjectId

from app.db.database import database
from app.core.logging import get_logger
from app.services.settlement_service import (
    IST_OFFSET,
    get_current_ist_date,
    get_settlement_window_bounds,
    _extract_order_food_subtotal,
)

logger = get_logger(__name__)

CANTEEN_COMMISSION_RATE = 0.18


def get_settlement_cycle(target_date: str | date | datetime) -> tuple[str, str]:
    """
    Computes settlement cycle day and scheduled payout date:
    - Orders from Monday (0), Tuesday (1), Wednesday (2) -> scheduled for Friday payout (same week).
    - Orders from Thursday (3), Friday (4), Saturday (5), Sunday (6) -> scheduled for Tuesday payout (next week).
    
    Returns:
        tuple[cycle_day, scheduled_payout_date_str]
        cycle_day: "FRIDAY" | "TUESDAY"
        scheduled_payout_date_str: "YYYY-MM-DD"
    """
    if isinstance(target_date, str):
        parts = [int(p) for p in target_date.split("-")]
        d = date(parts[0], parts[1], parts[2])
    elif isinstance(target_date, datetime):
        d = target_date.date()
    else:
        d = target_date

    wd = d.weekday()  # Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    if wd in (0, 1, 2):
        cycle_day = "FRIDAY"
        days_ahead = 4 - wd  # Friday is weekday 4
    else:
        cycle_day = "TUESDAY"
        days_ahead = (1 - wd) % 7
        if days_ahead == 0:
            days_ahead = 7

    payout_dt = d + timedelta(days=days_ahead)
    return cycle_day, payout_dt.strftime("%Y-%m-%d")


def format_payout_date_friendly(date_str: str) -> str:
    """Formats 'YYYY-MM-DD' into 'Friday, Oct 17'."""
    try:
        parts = [int(p) for p in date_str.split("-")]
        d = date(parts[0], parts[1], parts[2])
        return d.strftime("%A, %b %d")
    except Exception:
        return date_str


def _get_col(name: str):
    if hasattr(database, "get") and callable(database.get):
        col = database.get(name)
        if col is not None:
            return col
    if hasattr(database, name):
        return getattr(database, name)
    try:
        return database[name]
    except Exception:
        return None


async def _iterate_cursor(cursor):
    """Safely yields documents from Motor async cursors, sync iterators, or Mock objects."""
    if cursor is None:
        return
    if hasattr(cursor, "__aiter__"):
        async for item in cursor:
            yield item
    elif hasattr(cursor, "to_list") and callable(cursor.to_list):
        items = await cursor.to_list(length=None)
        for item in items:
            yield item
    elif hasattr(cursor, "__iter__"):
        for item in cursor:
            yield item



async def resolve_canteen_details(canteen_id: str) -> dict[str, Any]:
    """
    Resolves canonical canteen document, id, name, and settlement UPI.
    Accepts ObjectId string, email, slug, or name.
    """
    clean_id = (canteen_id or "").strip()
    restaurants_col = _get_col("restaurants")
    rest = None

    if restaurants_col is not None:
        query_clauses = [
            {"email": clean_id.lower()},
            {"owner_email": clean_id.lower()},
            {"name": {"$regex": f"^{clean_id}$", "$options": "i"}},
            {"slug": clean_id.lower()},
        ]
        if ObjectId.is_valid(clean_id):
            query_clauses.append({"_id": ObjectId(clean_id)})

        rest = await restaurants_col.find_one({"$or": query_clauses})

    canteen_canonical_id = str(rest["_id"]) if rest and "_id" in rest else clean_id
    canteen_name = (
        (rest or {}).get("name")
        or (clean_id.split("@")[0].replace(".", " ").replace("-", " ").title())
        or "Campus Canteen"
    )
    canteen_email = (rest or {}).get("email") or clean_id
    upi_id = (
        (rest or {}).get("settlement_upi_id")
        or (rest or {}).get("upi_id")
        or (rest or {}).get("vpa")
        or f"{canteen_name.lower().replace(' ', '')}@okaxis"
    )
    phone = (rest or {}).get("phone") or ""

    return {
        "canteen_id": canteen_canonical_id,
        "canteen_name": canteen_name,
        "canteen_email": canteen_email,
        "upi_id": upi_id,
        "phone": phone,
        "restaurant_doc": rest,
    }


async def generate_or_get_daily_canteen_ledger(
    canteen_id: str,
    target_date: str | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """
    Retrieves or generates the itemized EOD daily ledger for a given canteen and date.
    Schema matches requirements:
    {
      "ledger_id": "ledger_{canteen_id}_{YYYY-MM-DD}",
      "canteen_id": str,
      "canteen_name": str,
      "date": "YYYY-MM-DD",
      "metrics": {
        "total_completed_orders": int,
        "gross_food_sales": float,
        "commission_rate": 0.18,
        "commission_amount": float,
        "net_payout_accrued": float
      },
      "settlement_batch": {
        "cycle_day": "TUESDAY" | "FRIDAY",
        "scheduled_payout_date": "YYYY-MM-DD",
        "status": "QUEUED" | "PROCESSING" | "SETTLED",
        "utr_number": str | null,
        "settled_at": datetime | null
      },
      "orders": list,
      "created_at": datetime
    }
    """
    date_str = target_date or get_current_ist_date()
    canteen_info = await resolve_canteen_details(canteen_id)
    canonical_id = canteen_info["canteen_id"]
    canteen_name = canteen_info["canteen_name"]
    ledger_id = f"ledger_{canonical_id}_{date_str}"

    ledgers_col = _get_col("daily_canteen_ledgers")

    existing_ledger = None
    if ledgers_col is not None:
        existing_ledger = await ledgers_col.find_one({
            "$or": [
                {"ledger_id": ledger_id},
                {"ledger_id": f"ledger_{canteen_id}_{date_str}"},
                {"canteen_id": canonical_id, "date": date_str},
                {"canteen_id": canteen_id, "date": date_str},
            ]
        })

    # If already finalized/settled and not forced, return as-is
    if existing_ledger and existing_ledger.get("settlement_batch", {}).get("status") == "SETTLED" and not force_refresh:
        existing_ledger["_id"] = str(existing_ledger.get("_id", ledger_id))
        return existing_ledger

    # Compute settlement cycle
    cycle_day, scheduled_payout_date = get_settlement_cycle(date_str)

    # Settlement window bounds (00:00:00 to 21:00:00 IST)
    start_utc, end_utc = get_settlement_window_bounds(date_str)

    # Query completed / delivered orders for this canteen
    orders_col = _get_col("orders")
    matching_orders = []

    if orders_col is not None:
        rest_doc = canteen_info.get("restaurant_doc") or {}
        id_clauses = [
            {"restaurant_id": canonical_id},
            {"restaurant_id": canteen_id},
            {"restaurant_name": canteen_name},
        ]
        if ObjectId.is_valid(canonical_id):
            id_clauses.append({"restaurant_id": ObjectId(canonical_id)})
        if canteen_info.get("canteen_email"):
            id_clauses.append({"restaurant_email": canteen_info["canteen_email"].lower()})
        if rest_doc.get("email"):
            id_clauses.append({"restaurant_email": rest_doc["email"].lower()})
        if rest_doc.get("owner_email"):
            id_clauses.append({"restaurant_email": rest_doc["owner_email"].lower()})

        query = {
            "$and": [
                {"$or": id_clauses},
                {"status": {"$in": ["Delivered", "delivered", "Completed", "completed", "REDEEMED", "redeemed"]}},
            ]
        }

        cursor = orders_col.find(query)
        async for o in _iterate_cursor(cursor):
            created_at = o.get("created_at")
            delivered_at = o.get("delivered_at") or created_at

            in_window = False
            if isinstance(delivered_at, datetime):
                tz_aware = delivered_at if delivered_at.tzinfo else delivered_at.replace(tzinfo=UTC)
                if start_utc <= tz_aware <= end_utc:
                    in_window = True
            elif isinstance(delivered_at, str) and delivered_at.startswith(date_str):
                in_window = True
            elif isinstance(created_at, str) and created_at.startswith(date_str):
                in_window = True
            elif not delivered_at and not created_at:
                in_window = True

            if in_window:
                matching_orders.append(o)

    gross_food_sales = 0.0
    itemized_orders = []

    for o in matching_orders:
        subtotal = _extract_order_food_subtotal(o)
        gross_food_sales += subtotal
        comm = round(subtotal * CANTEEN_COMMISSION_RATE, 2)
        net = round(subtotal - comm, 2)

        items_desc = []
        raw_items = o.get("items") or []
        if isinstance(raw_items, list):
            for itm in raw_items:
                if isinstance(itm, dict):
                    name = itm.get("name") or itm.get("item_name") or "Food Item"
                    qty = itm.get("quantity") or 1
                    price = itm.get("price") or 0.0
                    items_desc.append(f"{qty}x {name} (₹{price})")

        itemized_orders.append({
            "order_id": str(o.get("_id") or o.get("order_id") or ""),
            "order_number": str(o.get("order_number") or o.get("_id") or "")[-6:].upper(),
            "customer_name": o.get("customer_name") or o.get("user_name") or "Campus Student",
            "food_subtotal": subtotal,
            "commission_amount": comm,
            "net_payout": net,
            "items_summary": ", ".join(items_desc) if items_desc else "Standard Meal Items",
            "payment_method": o.get("payment_method") or "online",
            "delivered_at": str(o.get("delivered_at") or o.get("created_at") or ""),
            "status": o.get("status") or "Delivered",
        })

    gross_food_sales = round(gross_food_sales, 2)
    commission_amount = round(gross_food_sales * CANTEEN_COMMISSION_RATE, 2)
    net_payout_accrued = round(gross_food_sales - commission_amount, 2)

    # Preserve batch status if previously set
    prev_batch = (existing_ledger or {}).get("settlement_batch") or {}
    batch_status = prev_batch.get("status") or "QUEUED"
    utr_number = prev_batch.get("utr_number")
    settled_at = prev_batch.get("settled_at")

    now_utc = datetime.now(UTC)

    ledger_doc = {
        "ledger_id": ledger_id,
        "canteen_id": canonical_id,
        "canteen_name": canteen_name,
        "date": date_str,
        "metrics": {
            "total_completed_orders": len(matching_orders),
            "gross_food_sales": gross_food_sales,
            "commission_rate": CANTEEN_COMMISSION_RATE,
            "commission_amount": commission_amount,
            "net_payout_accrued": net_payout_accrued,
        },
        "settlement_batch": {
            "cycle_day": cycle_day,
            "scheduled_payout_date": scheduled_payout_date,
            "status": batch_status,
            "utr_number": utr_number,
            "settled_at": settled_at,
        },
        "orders": itemized_orders,
        "created_at": (existing_ledger or {}).get("created_at") or now_utc,
        "updated_at": now_utc,
    }

    if ledgers_col is not None:
        await ledgers_col.update_one(
            {"ledger_id": ledger_id},
            {"$set": ledger_doc},
            upsert=True,
        )

    # Also update legacy/reporting canteen_settlements document for backward compatibility
    canteen_settlements_col = _get_col("canteen_settlements")
    if canteen_settlements_col is not None:
        gst_val = round(gross_food_sales * 0.05, 2)
        await canteen_settlements_col.update_one(
            {
                "$or": [
                    {"restaurant_id": canonical_id, "settlement_date": date_str},
                    {"restaurant_email": canteen_info["canteen_email"].lower(), "settlement_date": date_str},
                ]
            },
            {
                "$set": {
                    "restaurant_id": canonical_id,
                    "restaurant_name": canteen_name,
                    "restaurant_email": canteen_info["canteen_email"].lower(),
                    "settlement_date": date_str,
                    "date": date_str,
                    "orders_count": len(matching_orders),
                    "gross_food_sales": gross_food_sales,
                    "commission_deducted": commission_amount,
                    "platform_commission": commission_amount,
                    "gst_collected": gst_val,
                    "net_payable_subtotal": net_payout_accrued,
                    "net_canteen_payable": net_payout_accrued,
                    "status": "Settled" if batch_status == "SETTLED" else "Pending",
                    "transaction_ref": utr_number or "",
                    "upi_id": canteen_info["upi_id"],
                    "phone": canteen_info["phone"],
                    "scheduled_payout_date": scheduled_payout_date,
                    "cycle_day": cycle_day,
                }
            },
            upsert=True,
        )

    return ledger_doc


async def get_canteen_daily_ledgers(
    canteen_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
    target_date: str | None = None,
    limit: int = 60,
) -> dict[str, Any]:
    """Returns itemized daily statements with date filter."""
    canteen_info = await resolve_canteen_details(canteen_id)
    canonical_id = canteen_info["canteen_id"]
    canteen_name = canteen_info["canteen_name"]

    # Always ensure today's ledger is generated/refreshed
    today_ist = get_current_ist_date()
    await generate_or_get_daily_canteen_ledger(canonical_id, target_date=today_ist)

    ledgers_col = _get_col("daily_canteen_ledgers")
    records = []

    if ledgers_col is not None:
        query: dict[str, Any] = {
            "$or": [
                {"canteen_id": canonical_id},
                {"canteen_id": canteen_id},
                {"canteen_name": canteen_name},
            ]
        }

        if target_date:
            query["date"] = target_date
        elif start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        elif start_date:
            query["date"] = {"$gte": start_date}
        elif end_date:
            query["date"] = {"$lte": end_date}

        cursor = ledgers_col.find(query).sort("date", -1).limit(limit)
        async for doc in _iterate_cursor(cursor):
            doc["_id"] = str(doc.get("_id", doc.get("ledger_id")))
            records.append(doc)

    # Sort descending by date
    records.sort(key=lambda x: x.get("date", ""), reverse=True)

    total_gross = sum(float(r.get("metrics", {}).get("gross_food_sales", 0.0)) for r in records)
    total_comm = sum(float(r.get("metrics", {}).get("commission_amount", 0.0)) for r in records)
    total_net = sum(float(r.get("metrics", {}).get("net_payout_accrued", 0.0)) for r in records)
    total_orders = sum(int(r.get("metrics", {}).get("total_completed_orders", 0)) for r in records)

    return {
        "canteen_id": canonical_id,
        "canteen_name": canteen_name,
        "canteen_email": canteen_info["canteen_email"],
        "upi_id": canteen_info["upi_id"],
        "ledgers": records,
        "total_ledgers": len(records),
        "summary": {
            "total_gross_sales": round(total_gross, 2),
            "total_commission_amount": round(total_comm, 2),
            "total_net_payout": round(total_net, 2),
            "total_completed_orders": total_orders,
        },
    }


async def get_canteen_upcoming_disbursal(canteen_id: str) -> dict[str, Any]:
    """
    Returns pending accrued balance, next disbursal date (Tue or Fri),
    and linked daily ledger IDs for a canteen.
    """
    canteen_info = await resolve_canteen_details(canteen_id)
    canonical_id = canteen_info["canteen_id"]
    canteen_name = canteen_info["canteen_name"]

    today_ist = get_current_ist_date()
    # Ensure current day's ledger is populated
    await generate_or_get_daily_canteen_ledger(canonical_id, target_date=today_ist)

    # Determine next upcoming disbursal cycle
    cycle_day, scheduled_payout_date = get_settlement_cycle(today_ist)
    formatted_payout_date = format_payout_date_friendly(scheduled_payout_date)

    ledgers_col = _get_col("daily_canteen_ledgers")
    unsettled_ledgers = []

    if ledgers_col is not None:
        cursor = ledgers_col.find({
            "$or": [
                {"canteen_id": canonical_id},
                {"canteen_id": canteen_id},
            ],
            "settlement_batch.status": {"$ne": "SETTLED"},
        }).sort("date", 1)

        async for doc in _iterate_cursor(cursor):
            doc["_id"] = str(doc.get("_id", doc.get("ledger_id")))
            unsettled_ledgers.append(doc)

    accrued_net = sum(float(doc.get("metrics", {}).get("net_payout_accrued", 0.0)) for doc in unsettled_ledgers)
    gross_sales = sum(float(doc.get("metrics", {}).get("gross_food_sales", 0.0)) for doc in unsettled_ledgers)
    commission_amt = sum(float(doc.get("metrics", {}).get("commission_amount", 0.0)) for doc in unsettled_ledgers)
    pending_ids = [doc.get("ledger_id") for doc in unsettled_ledgers if doc.get("ledger_id")]

    return {
        "canteen_id": canonical_id,
        "canteen_name": canteen_name,
        "canteen_email": canteen_info["canteen_email"],
        "upi_id": canteen_info["upi_id"],
        "next_disbursal_date": scheduled_payout_date,
        "next_disbursal_day": cycle_day.title(),
        "formatted_payout_date": formatted_payout_date,
        "accrued_net_balance": round(accrued_net, 2),
        "accrued_net_earnings": round(accrued_net, 2),
        "total_gross_sales": round(gross_sales, 2),
        "commission_rate": CANTEEN_COMMISSION_RATE,
        "total_commission_amount": round(commission_amt, 2),
        "status_badge": "Queued for Bank Disbursal (T+2 Clearance)",
        "status": "QUEUED",
        "pending_ledger_ids": pending_ids,
        "daily_ledgers_count": len(unsettled_ledgers),
        "cycle_policy": "Mon-Wed orders disburse Friday; Thu-Sun orders disburse Tuesday.",
    }


async def settle_payout_batch(
    canteen_id: str | None = None,
    scheduled_payout_date: str | None = None,
    ledger_ids: list[str] | None = None,
    utr_number: str = "",
    notes: str = "",
) -> dict[str, Any]:
    """
    Marks one or more daily canteen ledgers as SETTLED by providing a UTR/UPI reference ID.
    """
    clean_utr = (utr_number or "").strip()
    if not clean_utr:
        clean_utr = f"UPI/BATCH/{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"

    ledgers_col = _get_col("daily_canteen_ledgers")
    canteen_settlements_col = _get_col("canteen_settlements")

    filter_query: dict[str, Any] = {}
    if ledger_ids and len(ledger_ids) > 0:
        filter_query["ledger_id"] = {"$in": ledger_ids}
    else:
        conditions = []
        if canteen_id:
            canteen_info = await resolve_canteen_details(canteen_id)
            conditions.append({"$or": [
                {"canteen_id": canteen_info["canteen_id"]},
                {"canteen_id": canteen_id},
            ]})
        if scheduled_payout_date:
            conditions.append({"settlement_batch.scheduled_payout_date": scheduled_payout_date})

        if conditions:
            filter_query["$and"] = conditions
        else:
            filter_query["settlement_batch.status"] = {"$ne": "SETTLED"}

    settled_at = datetime.now(UTC)
    modified_count = 0

    if ledgers_col is not None:
        # Find affected records to sync with canteen_settlements
        cursor = ledgers_col.find(filter_query)
        affected = []
        async for doc in _iterate_cursor(cursor):
            affected.append(doc)

        update_res = await ledgers_col.update_many(
            filter_query,
            {
                "$set": {
                    "settlement_batch.status": "SETTLED",
                    "settlement_batch.utr_number": clean_utr,
                    "settlement_batch.settled_at": settled_at,
                    "settlement_batch.notes": notes,
                    "updated_at": settled_at,
                }
            },
        )
        modified_count = update_res.modified_count

        # Sync legacy canteen_settlements collection
        if canteen_settlements_col is not None and affected:
            for item in affected:
                c_id = item.get("canteen_id")
                d_str = item.get("date")
                await canteen_settlements_col.update_many(
                    {
                        "$or": [
                            {"restaurant_id": c_id, "settlement_date": d_str},
                            {"restaurant_name": item.get("canteen_name"), "settlement_date": d_str},
                        ]
                    },
                    {
                        "$set": {
                            "status": "Settled",
                            "transaction_ref": clean_utr,
                            "settled_at": settled_at.isoformat(),
                        }
                    },
                )

    return {
        "success": True,
        "message": f"Successfully settled {modified_count} daily ledger(s)",
        "settled_count": modified_count,
        "utr_number": clean_utr,
        "settled_at": settled_at.isoformat(),
    }


async def get_admin_current_disbursal_batches() -> dict[str, Any]:
    """
    Returns current disbursal batch information for Admin:
    - Lists total owed to each canteen with queued/unsettled ledgers
    - Grouped for next Tue or Fri payout.
    """
    today_ist = get_current_ist_date()
    cycle_day, scheduled_payout_date = get_settlement_cycle(today_ist)
    formatted_payout_date = format_payout_date_friendly(scheduled_payout_date)

    restaurants_col = _get_col("restaurants")
    ledgers_col = _get_col("daily_canteen_ledgers")

    all_restaurants = []
    if restaurants_col is not None:
        cursor = restaurants_col.find({})
        async for r in _iterate_cursor(cursor):
            all_restaurants.append(r)

    batches = []
    total_batch_net = 0.0
    total_batch_food = 0.0
    total_batch_comm = 0.0

    for r in all_restaurants:
        c_id = str(r.get("_id"))
        c_name = r.get("name") or "Canteen"
        c_email = r.get("email") or ""
        upi_id = (
            r.get("settlement_upi_id")
            or r.get("upi_id")
            or f"{c_name.lower().replace(' ', '')}@okaxis"
        )
        phone = r.get("phone") or ""

        # Ensure today's ledger is calculated
        await generate_or_get_daily_canteen_ledger(c_id, today_ist)

        unsettled_docs = []
        if ledgers_col is not None:
            cursor = ledgers_col.find({
                "$or": [{"canteen_id": c_id}, {"canteen_name": c_name}],
                "settlement_batch.status": {"$ne": "SETTLED"},
            })
            async for doc in _iterate_cursor(cursor):
                unsettled_docs.append(doc)

        canteen_net = sum(float(d.get("metrics", {}).get("net_payout_accrued", 0.0)) for d in unsettled_docs)
        canteen_gross = sum(float(d.get("metrics", {}).get("gross_food_sales", 0.0)) for d in unsettled_docs)
        canteen_comm = sum(float(d.get("metrics", {}).get("commission_amount", 0.0)) for d in unsettled_docs)
        canteen_orders = sum(int(d.get("metrics", {}).get("total_completed_orders", 0)) for d in unsettled_docs)
        ledger_ids = [d.get("ledger_id") for d in unsettled_docs if d.get("ledger_id")]

        total_batch_net += canteen_net
        total_batch_food += canteen_gross
        total_batch_comm += canteen_comm

        batches.append({
            "canteen_id": c_id,
            "canteen_name": c_name,
            "canteen_email": c_email,
            "upi_id": upi_id,
            "phone": phone,
            "orders_count": canteen_orders,
            "gross_food_sales": round(canteen_gross, 2),
            "commission_amount": round(canteen_comm, 2),
            "net_owed": round(canteen_net, 2),
            "ledger_ids": ledger_ids,
            "unsettled_days_count": len(unsettled_docs),
            "status": "QUEUED" if canteen_net > 0 else "SETTLED",
            "cycle_day": cycle_day,
            "scheduled_payout_date": scheduled_payout_date,
        })

    return {
        "scheduled_payout_date": scheduled_payout_date,
        "cycle_day": cycle_day,
        "formatted_payout_date": formatted_payout_date,
        "status_badge": "Queued for Bank Disbursal (T+2 Clearance)",
        "canteens": batches,
        "summary": {
            "total_canteens": len(batches),
            "total_batch_net_owed": round(total_batch_net, 2),
            "total_food_sales": round(total_batch_food, 2),
            "total_commission": round(total_batch_comm, 2),
        },
    }


async def get_admin_daily_platform_ledger(limit: int = 30) -> dict[str, Any]:
    """
    Returns CampusBite's total 18% take-rate and platform fee earnings per calendar day.
    """
    orders_col = _get_col("orders")
    ledgers_col = _get_col("daily_canteen_ledgers")

    days_map: dict[str, dict[str, Any]] = {}

    # Seed with the last 14 days
    today = date.today()
    for i in range(14):
        d_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        cycle_day, scheduled_payout_date = get_settlement_cycle(d_str)
        days_map[d_str] = {
            "date": d_str,
            "total_completed_orders": 0,
            "gross_food_sales": 0.0,
            "platform_take_rate_18": 0.0,
            "platform_tech_fees": 0.0,
            "total_platform_revenue": 0.0,
            "canteen_net_accrued": 0.0,
            "cycle_day": cycle_day,
            "scheduled_payout_date": scheduled_payout_date,
            "status": "QUEUED",
        }

    # Populate from orders
    if orders_col is not None:
        cursor = orders_col.find({
            "status": {"$in": ["Delivered", "delivered", "Completed", "completed", "REDEEMED", "redeemed"]}
        })
        async for o in _iterate_cursor(cursor):
            delivered_at = o.get("delivered_at") or o.get("created_at")
            if isinstance(delivered_at, datetime):
                # Convert to IST date
                ist_dt = delivered_at.astimezone(IST_OFFSET) if delivered_at.tzinfo else delivered_at + timedelta(hours=5, minutes=30)
                d_str = ist_dt.strftime("%Y-%m-%d")
            elif isinstance(delivered_at, str) and len(delivered_at) >= 10:
                d_str = delivered_at[:10]
            else:
                continue

            if d_str not in days_map:
                cycle_day, scheduled_payout_date = get_settlement_cycle(d_str)
                days_map[d_str] = {
                    "date": d_str,
                    "total_completed_orders": 0,
                    "gross_food_sales": 0.0,
                    "platform_take_rate_18": 0.0,
                    "platform_tech_fees": 0.0,
                    "total_platform_revenue": 0.0,
                    "canteen_net_accrued": 0.0,
                    "cycle_day": cycle_day,
                    "scheduled_payout_date": scheduled_payout_date,
                    "status": "QUEUED",
                }

            food_subtotal = _extract_order_food_subtotal(o)
            pricing = o.get("pricing_breakdown") or {}
            tech_fee = float(
                pricing.get("platform_tech_fee")
                or o.get("platform_tech_fee")
                or (5.0 if food_subtotal < 50.0 else 3.0)
            )

            entry = days_map[d_str]
            entry["total_completed_orders"] += 1
            entry["gross_food_sales"] += food_subtotal
            entry["platform_tech_fees"] += tech_fee

    # Compute platform commission and net
    sorted_days = sorted(days_map.keys(), reverse=True)[:limit]
    items = []
    for d_str in sorted_days:
        e = days_map[d_str]
        gross = round(e["gross_food_sales"], 2)
        comm = round(gross * CANTEEN_COMMISSION_RATE, 2)
        tech = round(e["platform_tech_fees"], 2)
        total_rev = round(comm + tech, 2)
        canteen_net = round(gross - comm, 2)

        items.append({
            "date": d_str,
            "total_completed_orders": e["total_completed_orders"],
            "gross_food_sales": gross,
            "platform_take_rate_18": comm,
            "platform_tech_fees": tech,
            "total_platform_revenue": total_rev,
            "canteen_net_accrued": canteen_net,
            "cycle_day": e["cycle_day"],
            "scheduled_payout_date": e["scheduled_payout_date"],
            "status": e["status"],
        })

    total_gross_all = sum(i["gross_food_sales"] for i in items)
    total_comm_all = sum(i["platform_take_rate_18"] for i in items)
    total_tech_all = sum(i["platform_tech_fees"] for i in items)
    total_rev_all = sum(i["total_platform_revenue"] for i in items)
    total_canteen_net_all = sum(i["canteen_net_accrued"] for i in items)

    return {
        "days": items,
        "total_days": len(items),
        "summary": {
            "total_gross_food_sales": round(total_gross_all, 2),
            "total_take_rate_18": round(total_comm_all, 2),
            "total_platform_tech_fees": round(total_tech_all, 2),
            "total_platform_revenue": round(total_rev_all, 2),
            "total_canteen_net_accrued": round(total_canteen_net_all, 2),
        },
    }
