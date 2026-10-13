"""Courier route module and financial serialization hardening.

Ensures every returned order and courier settlement / reconciliation object provides non-null values for:
- items_subtotal: float (default 0.0)
- gst: float (default 0.0)
- delivery_fee: float (default 0.0)
- platform_fee: float (default 0.0)
- commission_amount: float (default 0.0)
- net_payout: float (default 0.0)
- total_amount: float (default 0.0)
"""

from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, DELIVERY_PARTNER
from app.models.delivery_partner import (
    get_delivery_partner_by_phone,
    get_delivery_partner_by_email,
    get_delivery_partner_by_id,
    serialize_partner_profile,
)
from app.models.order import (
    get_delivery_orders,
    normalize_order_financials,
)
from app.db.database import database



def normalize_courier_financials(obj: dict) -> dict:
    """Guarantees non-null float defaults for all 7 standard financial fields."""
    if not isinstance(obj, dict):
        return obj

    # If this is an order object
    if "items" in obj or "status" in obj and ("restaurant_email" in obj or "delivery_partner" in obj):
        return normalize_order_financials(obj)

    # Courier settlement / summary object
    wages = float(obj.get("wages_earned") or obj.get("total_payout_earned") or 0.0)
    cod = float(obj.get("cod_collected") or obj.get("cash_in_hand") or 0.0)
    net_due = float(
        obj.get("net_cash_due_to_admin")
        if obj.get("net_cash_due_to_admin") is not None
        else (obj.get("net_cash_due") if obj.get("net_cash_due") is not None else max(0.0, cod - wages))
    )

    subtotal = float(obj.get("items_subtotal") or 0.0)
    gst = float(obj.get("gst") or 0.0)
    delivery_fee = float(
        obj.get("delivery_fee") if obj.get("delivery_fee") is not None else wages
    )
    platform_fee = float(obj.get("platform_fee") or 0.0)
    commission = float(obj.get("commission_amount") or 0.0)
    net_payout = float(
        obj.get("net_payout") if obj.get("net_payout") is not None else wages
    )
    total_val = float(
        obj.get("total_amount") if obj.get("total_amount") is not None else cod
    )

    obj["items_subtotal"] = subtotal
    obj["gst"] = gst
    obj["delivery_fee"] = delivery_fee
    obj["platform_fee"] = platform_fee
    obj["commission_amount"] = commission
    obj["net_payout"] = net_payout
    obj["total_amount"] = total_val
    obj["wages_earned"] = wages
    obj["cod_collected"] = cod
    obj["net_cash_due"] = net_due

    return obj


from app.services.courier_service import (
    calculate_courier_order_wage,
    apply_courier_batch_wages,
)

router = APIRouter(
    prefix="/courier",
    tags=["Courier"],
)


def _get_col(db_obj: Any, col_name: str) -> Any:
    if db_obj is None:
        return None
    if isinstance(db_obj, dict):
        return db_obj.get(col_name)
    try:
        return db_obj[col_name]
    except Exception:
        return None


@router.get("/orders/active")
@router.get("/orders/assigned")
async def get_courier_active_orders(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    courier_id: Annotated[str | None, Query()] = None,
    phone: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> dict[str, Any]:
    from app.db.database import database as db

    target_courier_id = courier_id or str(
        current_user.get("_id") or current_user.get("id") or current_user.get("courier_id") or ""
    )
    rider_phone = phone or current_user.get("phone") or ""

    if rider_phone:
        try:
            assert_same_identity(current_user, phone=rider_phone)
        except Exception:
            pass

    orders_col = _get_col(db, "orders")
    if orders_col is None:
        return {"success": True, "orders": [], "count": 0}

    courier_filters: list[dict[str, Any]] = []
    if target_courier_id:
        courier_filters.extend([
            {"courier_id": target_courier_id},
            {"delivery_partner.id": target_courier_id},
            {"delivery_partner._id": target_courier_id},
            {"delivery_partner_id": target_courier_id},
        ])
    if rider_phone:
        courier_filters.extend([
            {"courier_phone": rider_phone},
            {"delivery_partner.phone": rider_phone},
            {"delivery_partner.phone_number": rider_phone},
        ])

    allowed_statuses = ["assigned", "out_for_delivery", "picked up", "picked_up", "Assigned", "Out for Delivery", "Picked Up"]
    status_query = status if status else {"$in": allowed_statuses}

    find_filter: dict[str, Any] = {"status": status_query}
    if courier_filters:
        find_filter["$or"] = courier_filters
    elif target_courier_id:
        find_filter["courier_id"] = target_courier_id

    try:
        cursor = orders_col.find(find_filter)
        if hasattr(cursor, "limit"):
            cursor = cursor.limit(limit)
        raw_orders = await cursor.to_list(limit)
    except Exception:
        raw_orders = []

    if not raw_orders:
        return {"success": True, "orders": [], "count": 0}

    formatted_orders = []
    for o in raw_orders:
        o_dict = dict(o)
        o_dict["_id"] = str(o_dict.get("_id", ""))
        formatted_orders.append(normalize_order_financials(o_dict))

    # Order the batch by pickup / sequence (accepted_at ascending)
    formatted_orders.sort(
        key=lambda o: str(
            (o.get("delivery_partner") or {}).get("accepted_at")
            or o.get("accepted_at")
            or o.get("created_at")
            or ""
        )
    )

    orders = apply_courier_batch_wages(formatted_orders)
    return {"success": True, "orders": orders, "count": len(orders)}


@router.get("/me")
async def get_courier_profile(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    courier_id: Annotated[str | None, Query()] = None,
    phone: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    from app.db.database import database as db

    target_courier_id = courier_id or str(
        current_user.get("_id") or current_user.get("id") or current_user.get("courier_id") or ""
    )
    rider_phone = phone or current_user.get("phone") or ""

    partner = None
    partners_col = _get_col(db, "delivery_partners")
    if partners_col is not None:
        try:
            if rider_phone:
                partner = await partners_col.find_one({"phone": rider_phone})
            if not partner and target_courier_id:
                partner = await partners_col.find_one({"_id": target_courier_id})
        except Exception:
            partner = None

    if not partner and rider_phone:
        try:
            partner = await get_delivery_partner_by_phone(rider_phone)
        except Exception:
            pass
    if not partner and target_courier_id:
        try:
            partner = await get_delivery_partner_by_id(target_courier_id)
        except Exception:
            pass

    # Directly calculate cash_in_hand from real unpaid COD orders:
    cod_query: dict[str, Any] = {
        "payment_method": {"$in": ["cod", "COD", "cash", "Cash"]},
        "status": {"$in": ["delivered", "Delivered", "completed", "Completed"]},
        "is_remitted": {"$ne": True},
    }
    courier_filters: list[dict[str, Any]] = []
    if target_courier_id:
        courier_filters.extend([
            {"courier_id": target_courier_id},
            {"delivery_partner.id": target_courier_id},
            {"delivery_partner._id": target_courier_id},
            {"delivery_partner_id": target_courier_id},
        ])
    if rider_phone:
        courier_filters.extend([
            {"courier_phone": rider_phone},
            {"delivery_partner.phone": rider_phone},
        ])
    if courier_filters:
        cod_query["$or"] = courier_filters
    elif target_courier_id:
        cod_query["courier_id"] = target_courier_id

    cod_orders = []
    orders_col = _get_col(db, "orders")
    if orders_col is not None:
        try:
            cod_orders = await orders_col.find(cod_query).to_list(100)
        except Exception:
            cod_orders = []

    cash_collected = sum(float(o.get("total_amount") or o.get("total") or 0.0) for o in cod_orders)

    total_earned = float(
        (partner or {}).get("total_payout_earned")
        or (partner or {}).get("wages_earned")
        or 0.0
    )
    net_due = max(0.0, cash_collected - total_earned)
    is_locked = bool(
        (partner or {}).get("is_locked", False)
        or net_due >= 500.00
    )

    orders_completed = int(
        (partner or {}).get("total_deliveries")
        or (partner or {}).get("orders_completed")
        or (partner or {}).get("completed_deliveries")
        or 0
    )

    data = {
        "success": True,
        "id": target_courier_id or str((partner or {}).get("_id", "")),
        "name": (partner or {}).get("name") or (partner or {}).get("full_name") or current_user.get("name") or "Courier",
        "phone": rider_phone or (partner or {}).get("phone") or "",
        "email": (partner or {}).get("email") or current_user.get("email") or "",
        "cash_in_hand": round(cash_collected, 2),
        "total_payout_earned": round(total_earned, 2),
        "net_cash_due": round(net_due, 2),
        "is_locked": is_locked,
        "orders_completed": orders_completed,
    }
    return normalize_courier_financials(data)


@router.get("/stats")
async def get_courier_stats(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    courier_id: Annotated[str | None, Query()] = None,
    phone: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    from app.db.database import database as db

    target_courier_id = courier_id or str(
        current_user.get("_id") or current_user.get("id") or current_user.get("courier_id") or ""
    )
    rider_phone = phone or current_user.get("phone") or ""

    partner = None
    partners_col = _get_col(db, "delivery_partners")
    if partners_col is not None:
        try:
            if rider_phone:
                partner = await partners_col.find_one({"phone": rider_phone})
            if not partner and target_courier_id:
                partner = await partners_col.find_one({"_id": target_courier_id})
        except Exception:
            partner = None

    if not partner and rider_phone:
        try:
            partner = await get_delivery_partner_by_phone(rider_phone)
        except Exception:
            pass
    if not partner and target_courier_id:
        try:
            partner = await get_delivery_partner_by_id(target_courier_id)
        except Exception:
            pass

    # Directly calculate cash_in_hand from real unpaid COD orders:
    cod_query: dict[str, Any] = {
        "payment_method": {"$in": ["cod", "COD", "cash", "Cash"]},
        "status": {"$in": ["delivered", "Delivered", "completed", "Completed"]},
        "is_remitted": {"$ne": True},
    }
    courier_filters: list[dict[str, Any]] = []
    if target_courier_id:
        courier_filters.extend([
            {"courier_id": target_courier_id},
            {"delivery_partner.id": target_courier_id},
            {"delivery_partner._id": target_courier_id},
            {"delivery_partner_id": target_courier_id},
        ])
    if rider_phone:
        courier_filters.extend([
            {"courier_phone": rider_phone},
            {"delivery_partner.phone": rider_phone},
        ])
    if courier_filters:
        cod_query["$or"] = courier_filters
    elif target_courier_id:
        cod_query["courier_id"] = target_courier_id

    cod_orders = []
    orders_col = _get_col(db, "orders")
    if orders_col is not None:
        try:
            cod_orders = await orders_col.find(cod_query).to_list(100)
        except Exception:
            cod_orders = []

    cash_collected = sum(float(o.get("total_amount") or o.get("total") or 0.0) for o in cod_orders)

    total_earned = float(
        (partner or {}).get("total_payout_earned")
        or (partner or {}).get("wages_earned")
        or 0.0
    )
    net_due = max(0.0, cash_collected - total_earned)
    is_locked = bool(
        (partner or {}).get("is_locked", False)
        or net_due >= 500.00
    )

    orders_completed = int(
        (partner or {}).get("total_deliveries")
        or (partner or {}).get("orders_completed")
        or (partner or {}).get("completed_deliveries")
        or 0
    )

    data = {
        "success": True,
        "cash_in_hand": round(cash_collected, 2),
        "total_payout_earned": round(total_earned, 2),
        "net_cash_due": round(net_due, 2),
        "orders_completed": orders_completed,
        "delivered_today": int((partner or {}).get("delivered_today") or 0),
        "is_locked": is_locked,
    }
    return normalize_courier_financials(data)




@router.get("/orders/{phone}")
async def get_courier_assigned_orders(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    status: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query()] = 50,
) -> list[dict[str, Any]]:
    assert_same_identity(current_user, phone=phone)
    raw_orders = await get_delivery_orders(phone=phone, status=status, limit=limit)
    if isinstance(raw_orders, dict) and "items" in raw_orders:
        orders = [normalize_order_financials(o) for o in raw_orders["items"]]
    else:
        orders = [normalize_order_financials(o) for o in (raw_orders or [])]

    # Sequence active runs with tiered batch wages
    active_orders = [
        o for o in orders
        if str(o.get("status", "")).strip().lower() in {"assigned", "picked up", "picked_up", "out for delivery", "out_for_delivery"}
    ]
    if active_orders:
        apply_courier_batch_wages(active_orders)

    return orders


@router.get("/reconciliation/{phone}")
async def get_courier_reconciliation(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
) -> dict[str, Any]:
    assert_same_identity(current_user, phone=phone)
    partner = await get_delivery_partner_by_phone(phone)
    if not partner:
        raise HTTPException(status_code=404, detail="Courier profile not found")

    cih = float(partner.get("cash_in_hand") or 0.0)
    payout = float(partner.get("total_payout_earned") or 0.0)
    due = float(
        partner.get("net_cash_due")
        if partner.get("net_cash_due") is not None
        else max(0.0, cih - payout)
    )

    data = {
        "id": str(partner.get("_id", "")),
        "name": partner.get("name") or "Courier",
        "phone": phone,
        "cash_in_hand": cih,
        "total_payout_earned": payout,
        "net_cash_due": due,
        "is_locked": bool(partner.get("is_locked", False)),
    }
    return normalize_courier_financials(data)


@router.get("/milestones/today")
@router.get("/milestones")
async def get_courier_today_milestones(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    courier_id: Annotated[str | None, Query()] = None,
    phone: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """
    Computes drops completed ONLY within today's IST calendar day.
    Resets at 11:59:59 PM IST daily.
    """
    from datetime import datetime, timezone, timedelta
    try:
        from zoneinfo import ZoneInfo
        tz_ist = ZoneInfo("Asia/Kolkata")
        tz_utc = ZoneInfo("UTC")
    except Exception:
        tz_ist = timezone(timedelta(hours=5, minutes=30))
        tz_utc = timezone.utc

    now_ist = datetime.now(tz_ist)
    start_of_day_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_day_utc = start_of_day_ist.astimezone(tz_utc)

    from app.db.database import database

    c_id = courier_id or str(current_user.get("_id") or current_user.get("id") or "")
    c_phone = phone or current_user.get("phone") or ""

    order_query = {
        "status": {"$in": ["delivered", "completed", "Delivered", "Completed"]},
        "$or": [
            {"delivered_at": {"$gte": start_of_day_utc}},
            {"delivered_at": {"$gte": start_of_day_ist.strftime("%Y-%m-%d")}},
            {"completed_at": {"$gte": start_of_day_utc}},
            {"created_at": {"$gte": start_of_day_utc}},
        ]
    }

    courier_filters = []
    if c_id:
        courier_filters.extend([
            {"courier_id": c_id},
            {"delivery_partner_id": c_id},
            {"delivery_partner._id": c_id},
            {"delivery_partner.id": c_id},
        ])
    if c_phone:
        courier_filters.extend([
            {"courier_phone": c_phone},
            {"delivery_partner_phone": c_phone},
            {"delivery_partner.phone": c_phone},
        ])

    if courier_filters:
        order_query["$and"] = [{"$or": courier_filters}]

    completed_today = 0
    if database is not None and "orders" in database:
        completed_today = await database["orders"].count_documents(order_query)

    bonus_earned = 0.0
    unlocked_tier = None
    if completed_today >= 15:
        bonus_earned = 100.0
        unlocked_tier = "Tier 3"
    elif completed_today >= 10:
        bonus_earned = 60.0
        unlocked_tier = "Tier 2"
    elif completed_today >= 5:
        bonus_earned = 30.0
        unlocked_tier = "Tier 1"

    end_of_day_ist = now_ist.replace(hour=23, minute=59, second=59, microsecond=999999)
    diff_seconds = max(0, int((end_of_day_ist - now_ist).total_seconds()))
    hours_left = diff_seconds // 3600
    mins_left = (diff_seconds % 3600) // 60

    return {
        "success": True,
        "completed_today": completed_today,
        "drops_completed": completed_today,
        "bonus_earned": bonus_earned,
        "unlocked_tier": unlocked_tier,
        "time_left": f"{hours_left}h {mins_left}m left",
        "seconds_remaining": diff_seconds,
        "start_of_day_utc": start_of_day_utc.isoformat(),
        "now_ist": now_ist.isoformat(),
    }
