from typing import Annotated, Callable
import re

from fastapi import APIRouter, Depends, Query

from app.auth.auth import require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.core.sanitize import sanitize_search_query
from app.db.database import database

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)

logger = get_logger(__name__)


def _stringify_id(doc: dict) -> str:
    return str(doc.get("_id", ""))


def _iso_date(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _safe_customer(doc: dict) -> dict:
    return {
        "id": _stringify_id(doc),
        "name": doc.get("full_name") or doc.get("name") or "",
        "email": doc.get("email") or "",
        "phone": doc.get("phone") or "",
        "created_at": _iso_date(doc.get("created_at")),
    }


def _safe_restaurant_owner(doc: dict) -> dict:
    return {
        "id": _stringify_id(doc),
        "name": doc.get("owner_name") or doc.get("name") or "",
        "email": doc.get("email") or "",
        "restaurant": doc.get("restaurant_name") or "",
    }


def _safe_delivery_partner(doc: dict) -> dict:
    online = doc.get("online")
    if online is True:
        status = "Online"
    elif online is False:
        status = "Offline"
    else:
        status = "Unknown"

    return {
        "id": _stringify_id(doc),
        "name": doc.get("name") or "",
        "email": doc.get("email") or "",
        "status": status,
    }


def _text_search_filter(fields: list[str], q: str | None) -> dict:
    if not q or not q.strip():
        return {}

    escaped = re.escape(q.strip())
    return {
        "$or": [
            {field: {"$regex": escaped, "$options": "i"}}
            for field in fields
        ]
    }


async def _list_safe(
    collection_name: str,
    fields: list[str],
    serializer: Callable[[dict], dict],
    q: str | None,
    *,
    page: int = 1,
    limit: int = 20,
) -> dict:
    from app.core.pagination import (
        normalize_limit,
        normalize_page,
        paginated_response,
        skip_for,
    )

    query = _text_search_filter(fields, sanitize_search_query(q))
    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await database[collection_name].count_documents(query)
    pages = max(1, (total + safe_limit - 1) // safe_limit) if total else 1
    meta_page = min(safe_page, pages)

    results: list[dict] = []
    cursor = (
        database[collection_name]
        .find(query)
        .sort("_id", -1)
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )

    async for doc in cursor:
        results.append(serializer(doc))

    return paginated_response(
        results, total=total, page=meta_page, limit=safe_limit
    )

@router.get("/health")
async def admin_health(
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """Simple protected admin probe used for auth verification."""
    logger.info("admin.health request received")
    result = {
        "ok": True,
        "role": current_user.get("role"),
        "email": current_user.get("email"),
    }
    logger.info("admin.health completed successfully")
    return result


from app.models.analytics import get_admin_financial_analytics


@router.get("/analytics")
@router.get("/analytics/financial-summary")
async def admin_analytics(
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """Aggregated financial metrics from delivered orders for admin dashboard."""
    logger.info("admin.analytics request received")
    metrics = await get_admin_financial_analytics()
    logger.info("admin.analytics completed successfully")
    return metrics


@router.get("/stats")
async def admin_stats(
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """Platform-wide document counts and financial summary for the admin dashboard."""
    logger.info("admin.stats request received")
    financials = await get_admin_financial_analytics()
    result = {
        "users": await database["users"].count_documents({}),
        "restaurant_owners": await database["restaurant_owners"].count_documents(
            {}
        ),
        "restaurants": await database["restaurants"].count_documents({}),
        "delivery_partners": await database["delivery_partners"].count_documents(
            {}
        ),
        "orders": await database["orders"].count_documents({}),
        **financials,
    }
    logger.info("admin.stats completed successfully")
    return result


@router.get("/users/customers")
async def list_customers(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    q: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """Safe read-only customer list for admin (no secrets)."""
    return await _list_safe(
        "users",
        ["full_name", "name", "email", "phone"],
        _safe_customer,
        q,
        page=page,
        limit=limit,
    )


@router.get("/users/restaurant-owners")
async def list_restaurant_owners(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    q: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """Safe read-only restaurant-owner list for admin (no secrets)."""
    return await _list_safe(
        "restaurant_owners",
        ["owner_name", "name", "email", "restaurant_name", "phone"],
        _safe_restaurant_owner,
        q,
        page=page,
        limit=limit,
    )


@router.get("/users/delivery-partners")
async def list_delivery_partners(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    q: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """Safe read-only delivery-partner list for admin (no secrets)."""
    return await _list_safe(
        "delivery_partners",
        ["name", "email", "phone", "vehicle", "vehicle_number"],
        _safe_delivery_partner,
        q,
        page=page,
        limit=limit,
    )


@router.get("/subscription-plans")
async def list_subscription_plans(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    q: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
    active: Annotated[bool | None, Query()] = None,
):
    from app.core.sanitize import sanitize_email
    from app.models.subscription_plan import list_plans_admin

    items = await list_plans_admin(
        q=sanitize_search_query(q),
        restaurant_email=sanitize_email(restaurant_email),
        active=active,
    )
    return {"items": items}


from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from app.core.audit import log_admin_action

ACTIVE_ORDER_STATUSES = [
    "Pending",
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Assigned",
    "Picked Up",
    "Out for Delivery",
]


def _to_object_id(id_str: str):
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError, ValueError):
        return None


def _id_filter(user_id: str) -> dict:
    oid = _to_object_id(user_id)
    if oid:
        return {"$or": [{"_id": oid}, {"_id": user_id}]}
    return {"_id": user_id}


@router.delete("/users/{role}/{user_id}")
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
    role: str | None = None,
):
    """
    Deletes a customer, restaurant owner, or delivery partner.
    Guarded with admin authorization, prevents self-deletion, and verifies active order constraints.
    """
    admin_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    # 1. Determine target collection
    role_normalized = (role or "").strip().lower().replace("-", "_").replace(" ", "_")
    target_collection_name = None
    if role_normalized in ["customers", "customer", "user", "users"]:
        target_collection_name = "users"
    elif role_normalized in [
        "restaurant_owners",
        "restaurant_owner",
        "owner",
        "owners",
        "restaurant",
    ]:
        target_collection_name = "restaurant_owners"
    elif role_normalized in [
        "delivery_partners",
        "delivery_partner",
        "driver",
        "drivers",
    ]:
        target_collection_name = "delivery_partners"

    query = _id_filter(user_id)
    user_doc = None
    collection_name = None

    if target_collection_name:
        user_doc = await database[target_collection_name].find_one(query)
        if user_doc:
            collection_name = target_collection_name
    else:
        # Search collections in order
        for col_name in ["users", "restaurant_owners", "delivery_partners"]:
            found = await database[col_name].find_one(query)
            if found:
                user_doc = found
                collection_name = col_name
                break

    if not user_doc or not collection_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # 2. Prevent self-deletion
    user_email = (user_doc.get("email") or "").strip().lower()
    user_doc_id = str(user_doc.get("_id", ""))
    if (
        user_email == admin_email
        or user_id == str(current_user.get("id"))
        or user_doc_id == str(current_user.get("id"))
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the currently logged-in admin account.",
        )

    # 3. Active dependency checks
    if collection_name == "restaurant_owners":
        if user_email:
            active_order = await database["orders"].find_one(
                {
                    "restaurant_email": user_email,
                    "status": {"$in": ACTIVE_ORDER_STATUSES},
                }
            )
            if active_order:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete restaurant owner with active unfulfilled orders.",
                )
            # Clean up associated restaurant and menu documents
            await database["restaurants"].delete_many({"email": user_email})
            await database["menu"].delete_many({"restaurant_email": user_email})

    elif collection_name == "delivery_partners":
        partner_phone = user_doc.get("phone")
        filter_clause = []
        if partner_phone:
            filter_clause.append({"delivery_partner_phone": partner_phone})
        if user_email:
            filter_clause.append({"delivery_partner_email": user_email})

        if filter_clause:
            active_delivery = await database["orders"].find_one(
                {
                    "$or": filter_clause,
                    "status": {
                        "$in": ["Assigned", "Picked Up", "Out for Delivery"]
                    },
                }
            )
            if active_delivery:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete delivery partner with active delivery assignments.",
                )

    elif collection_name == "users":
        customer_phone = user_doc.get("phone")
        filter_clause = []
        if customer_phone:
            filter_clause.append({"phone": customer_phone})
        if user_email:
            filter_clause.append({"customer_email": user_email})

        if filter_clause:
            active_order = await database["orders"].find_one(
                {
                    "$or": filter_clause,
                    "status": {"$in": ACTIVE_ORDER_STATUSES},
                }
            )
            if active_order:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete customer with active unfulfilled orders.",
                )

    # 4. Perform deletion
    await database[collection_name].delete_one({"_id": user_doc["_id"]})

    # 5. Audit log
    await log_admin_action(
        admin_email=admin_email,
        action="delete_user",
        resource=collection_name,
        resource_id=user_id,
        metadata={"deleted_email": user_email, "role": collection_name},
    )

    return {"success": True, "message": "User deleted successfully"}


@router.delete("/orders/{order_id}")
async def delete_order(
    order_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """
    Deletes an order record by ID.
    Guarded with admin authorization and logs audit action.
    """
    admin_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    query = _id_filter(order_id)
    order_doc = await database["orders"].find_one(query)
    if not order_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    await database["orders"].delete_one({"_id": order_doc["_id"]})

    await log_admin_action(
        admin_email=admin_email,
        action="delete_order",
        resource="orders",
        resource_id=order_id,
        metadata={
            "customer_name": order_doc.get("customer_name") or "",
            "customer_email": order_doc.get("customer_email") or "",
            "restaurant_email": order_doc.get("restaurant_email") or "",
            "total": order_doc.get("total") or 0,
        },
    )

    return {"success": True, "message": "Order deleted successfully"}


@router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(
    subscription_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """
    Deletes a mess meal subscription record by ID and cleans up pending payments.
    Guarded with admin authorization and logs audit action.
    """
    admin_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    query = _id_filter(subscription_id)
    sub_doc = await database["subscriptions"].find_one(query)
    if not sub_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    await database["subscriptions"].delete_one({"_id": sub_doc["_id"]})

    # Clean up associated subscription payments
    sub_id_str = str(sub_doc["_id"])
    await database["subscription_payments"].delete_many(
        {"subscription_id": {"$in": [sub_id_str, subscription_id]}}
    )

    await log_admin_action(
        admin_email=admin_email,
        action="delete_subscription",
        resource="subscriptions",
        resource_id=subscription_id,
        metadata={
            "customer_email": sub_doc.get("customer_email") or "",
            "restaurant_email": sub_doc.get("restaurant_email") or "",
            "plan_type": f"{sub_doc.get('meal_type')} · {sub_doc.get('subscription_type')}",
        },
    )

    return {"success": True, "message": "Subscription deleted successfully"}


@router.put("/riders/remit/{phone}")
async def acknowledge_rider_remittance(
    phone: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
    payload: dict | None = None,
):
    """
    Admin acknowledges / marks courier cash-in-hand remittance received.
    Resets courier cash-in-hand to 0 or deducts remitted amount, clears dues, and logs audit action.
    """
    admin_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    partner_doc = await database["delivery_partners"].find_one({"phone": phone})
    amount_remitted = float(payload.get("amount") or 0.0) if payload else 0.0

    if partner_doc:
        current_cih = float(partner_doc.get("cash_in_hand") or 0.0)
        remitted = amount_remitted if amount_remitted > 0 else current_cih
        new_cih = max(0.0, current_cih - remitted)
        total_payout = float(partner_doc.get("total_payout_earned") or 0.0)
        new_due = max(0.0, new_cih - total_payout)

        await database["delivery_partners"].update_one(
            {"_id": partner_doc["_id"]},
            {"$set": {"cash_in_hand": new_cih, "net_cash_due": new_due}},
        )

    await log_admin_action(
        admin_email=admin_email,
        action="acknowledge_rider_remittance",
        resource="delivery_partners",
        resource_id=phone,
        metadata={"phone": phone, "amount_remitted": amount_remitted},
    )

    return {
        "success": True,
        "message": f"Remittance acknowledged for courier {phone}",
        "phone": phone,
    }

def parse_date_range(date_str: str | None):
    """
    Normalizes incoming date parameter (YYYY-MM-DD, DD-MM-YYYY, ISO)
    into start-of-day, end-of-day datetimes and canonical YYYY-MM-DD prefix.
    """
    from datetime import datetime as dt, time as dt_time
    if not date_str:
        target_date = dt.now().date()
    else:
        date_clean = str(date_str).strip()
        try:
            if "-" in date_clean and len(date_clean.split("-")[0]) == 4:
                target_date = dt.strptime(date_clean, "%Y-%m-%d").date()
            elif "-" in date_clean:
                target_date = dt.strptime(date_clean, "%d-%m-%Y").date()
            else:
                target_date = dt.fromisoformat(date_clean).date()
        except Exception:
            target_date = dt.now().date()

    start_dt = dt.combine(target_date, dt_time.min)
    end_dt = dt.combine(target_date, dt_time.max)
    return start_dt, end_dt, target_date.strftime("%Y-%m-%d")


@router.get("/settlements/canteens")
async def get_canteen_settlements_breakdown(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    date: Annotated[str | None, Query()] = None,
):
    """
    Aggregates canteen daily settlements per restaurant for the specified date.
    Computes:
      - gross_food_sales = sum(order.items_subtotal)
      - platform_commission = sum(order.items_subtotal * 0.18)
      - gst_collected = sum(order.gst)
      - net_payout = gross_food_sales - platform_commission + gst_collected
    """
    start_dt, end_dt, date_prefix = parse_date_range(date)
    iso_prefix = f"^{date_prefix}"

    # Query delivered/completed orders matching date range
    orders = await database["orders"].find({
        "status": {"$in": ["delivered", "completed", "Delivered", "Completed"]},
        "$or": [
            {"created_at": {"$gte": start_dt, "$lte": end_dt}},
            {"created_at": {"$regex": iso_prefix}},
            {"delivered_at": {"$gte": start_dt, "$lte": end_dt}},
            {"delivered_at": {"$regex": iso_prefix}},
            {"order_date": {"$regex": iso_prefix}},
        ],
    }).to_list(1000)

    # Fetch all registered restaurants
    restaurants = await database["restaurants"].find({}).to_list(1000)

    # Fetch recorded settlement history for this date
    settled_cursor = database["canteen_settlements"].find({"settlement_date": date_prefix})
    settled_records = await settled_cursor.to_list(1000)
    settled_map = {}
    for sr in settled_records:
        r_id = str(sr.get("restaurant_id") or "")
        r_email = str(sr.get("restaurant_email") or "").strip().lower()
        if r_id:
            settled_map[r_id] = sr
        if r_email:
            settled_map[r_email] = sr

    def _get_subtotal(order: dict) -> float:
        if "items_subtotal" in order and order["items_subtotal"] is not None:
            return float(order["items_subtotal"])
        if "food_subtotal" in order and order["food_subtotal"] is not None:
            return float(order["food_subtotal"])
        items = order.get("items")
        if isinstance(items, list) and len(items) > 0:
            return sum(
                float(it.get("price", 0)) * int(it.get("quantity", 1))
                for it in items
            )
        return float(order.get("total_amount") or order.get("total") or 0.0)

    def _get_gst(order: dict, subtotal: float) -> float:
        if "gst" in order and order["gst"] is not None:
            return float(order["gst"])
        if "restaurant_gst" in order and order["restaurant_gst"] is not None:
            return float(order["restaurant_gst"])
        return round(subtotal * 0.05, 2)

    canteen_results = []
    total_sales = 0.0
    total_commission = 0.0
    total_gst = 0.0
    total_net = 0.0
    pending_net = 0.0
    paid_net = 0.0

    for rest in restaurants:
        r_id = str(rest.get("_id", ""))
        r_email = str(rest.get("email") or "").strip().lower()
        r_name = str(rest.get("name") or "").strip()

        # Match orders to this restaurant
        matching = []
        for o in orders:
            ord_rid = str(o.get("restaurant_id") or "")
            ord_email = str(o.get("restaurant_email") or "").strip().lower()
            ord_name = str(o.get("restaurant_name") or "").strip().lower()
            if (
                (r_id and ord_rid == r_id)
                or (r_email and ord_email == r_email)
                or (r_name and ord_name == r_name.lower())
            ):
                matching.append(o)

        gross = round(sum(_get_subtotal(o) for o in matching), 2)
        comm = round(gross * 0.18, 2)
        gst = round(sum(_get_gst(o, _get_subtotal(o)) for o in matching), 2)
        net = round(gross - comm + gst, 2)

        settled = settled_map.get(r_id) or settled_map.get(r_email)
        status = "Paid" if settled else "Pending"

        total_sales += gross
        total_commission += comm
        total_gst += gst
        total_net += net
        if status == "Paid":
            paid_net += net
        else:
            pending_net += net

        clean_slug = re.sub(r"[^a-z0-9]", "", r_name.lower()) or "canteen"
        upi = (
            rest.get("settlement_upi_id")
            or rest.get("upi_id")
            or f"{clean_slug}@okaxis"
        )

        canteen_results.append({
            "id": r_id,
            "restaurant_id": r_id,
            "restaurant_name": r_name,
            "restaurant_email": r_email,
            "phone": rest.get("phone") or "",
            "upi_id": upi,
            "bank_details": rest.get("bank_details") or {},
            "orders_count": len(matching),
            "gross_food_sales": gross,
            "platform_commission": comm,
            "gst_collected": gst,
            "net_payout": net,
            "status": status,
            "settled_at": settled.get("settled_at") if settled else None,
            "transaction_ref": settled.get("transaction_ref") if settled else None,
            "settlement_date": date_prefix,
            # Standard non-null financial attributes
            "items_subtotal": float(gross),
            "gst": float(gst),
            "delivery_fee": 0.0,
            "platform_fee": 0.0,
            "commission_amount": float(comm),
            "total_amount": float(round(gross + gst, 2)),
        })

    return {
        "canteens": canteen_results,
        "settlements": canteen_results,
        "summary": {
            "total_food_sales": round(total_sales, 2),
            "total_commission": round(total_commission, 2),
            "total_gst": round(total_gst, 2),
            "total_net_payout": round(total_net, 2),
            "pending_payout": round(pending_net, 2),
            "paid_payout": round(paid_net, 2),
        },
        "date": date_prefix,
    }


@router.post("/settlements/canteens/{canteen_id}/mark-paid")
async def mark_canteen_settlement_paid(
    canteen_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
    payload: dict | None = None,
):
    """
    Marks a canteen daily settlement as Paid, recording UTR/transaction ref and audit trail.
    """
    from datetime import datetime as dt, timezone as dt_tz
    admin_email = (
        current_user.get("email") or current_user.get("sub") or "admin@campusbite.in"
    ).strip().lower()

    payload = payload or {}
    _, _, date_prefix = parse_date_range(payload.get("date") or payload.get("settlement_date"))

    query = _id_filter(canteen_id)
    rest_doc = await database["restaurants"].find_one(query)
    if not rest_doc:
        rest_doc = await database["restaurants"].find_one({"email": canteen_id})

    restaurant_name = (
        (rest_doc.get("name") if rest_doc else None)
        or payload.get("restaurant_name")
        or "Campus Canteen"
    )
    restaurant_email = (
        (rest_doc.get("email") if rest_doc else None)
        or payload.get("restaurant_email")
        or canteen_id
    )
    amount = float(payload.get("amount") or payload.get("net_payout") or 0.0)
    upi_id = payload.get("upi_id") or (rest_doc.get("settlement_upi_id") if rest_doc else "") or ""
    txn_ref = payload.get("transaction_ref") or payload.get("utr") or f"UPI/{dt.now().strftime('%Y%m%d%H%M%S')}"

    settlement_record = {
        "restaurant_id": str(rest_doc["_id"]) if rest_doc else canteen_id,
        "restaurant_email": restaurant_email,
        "restaurant_name": restaurant_name,
        "settlement_date": date_prefix,
        "amount": amount,
        "net_payout": amount,
        "net_payable_subtotal": amount,
        "orders_count": int(payload.get("orders_count") or 0),
        "transaction_ref": txn_ref,
        "upi_id": upi_id,
        "settled_at": dt.now(dt_tz.utc).isoformat(),
        "settled_by": admin_email,
        "status": "Paid",
    }

    await database["canteen_settlements"].update_one(
        {
            "restaurant_email": restaurant_email,
            "settlement_date": date_prefix,
        },
        {"$set": settlement_record},
        upsert=True,
    )

    await log_admin_action(
        admin_email=admin_email,
        action="mark_canteen_settlement_paid",
        resource="canteen_settlements",
        resource_id=f"{restaurant_email}_{date_prefix}",
        metadata=settlement_record,
    )

    return {
        "success": True,
        "message": f"Settlement of ₹{amount:.2f} marked as Paid for {restaurant_name}",
        "settlement": settlement_record,
    }


@router.get("/settlements/couriers")
async def get_courier_settlements_breakdown(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    date: Annotated[str | None, Query()] = None,
):
    """
    Aggregates courier Cash-in-Hand (CIH) and wage economics per courier for the specified date.
    Computes:
      - cod_collected = sum(order.total_amount if order.payment_method == "cod")
      - wages_earned = len(completed_orders) * 20.0
      - net_cash_due_to_admin = max(0.0, cod_collected - wages_earned)
    """
    start_dt, end_dt, date_prefix = parse_date_range(date)
    iso_prefix = f"^{date_prefix}"

    # Query delivered orders matching date range
    orders = await database["orders"].find({
        "status": {"$in": ["delivered", "completed", "Delivered", "Completed"]},
        "$or": [
            {"created_at": {"$gte": start_dt, "$lte": end_dt}},
            {"created_at": {"$regex": iso_prefix}},
            {"delivered_at": {"$gte": start_dt, "$lte": end_dt}},
            {"delivered_at": {"$regex": iso_prefix}},
            {"order_date": {"$regex": iso_prefix}},
        ],
    }).to_list(1000)

    # Fetch registered delivery partners
    partners = await database["delivery_partners"].find({}).sort("name", 1).to_list(1000)

    courier_results = []
    total_cod = 0.0
    total_wages = 0.0
    total_due = 0.0
    locked_count = 0

    for partner in partners:
        p_id = str(partner.get("_id", ""))
        p_phone = str(partner.get("phone") or "").strip()
        p_name = partner.get("name") or partner.get("full_name") or "Courier"

        # Match orders to this courier (ObjectId, string id, or phone)
        matching = []
        for o in orders:
            dp = o.get("delivery_partner")
            dp_id = ""
            dp_phone = ""
            if isinstance(dp, dict):
                dp_id = str(dp.get("id") or dp.get("_id") or "")
                dp_phone = str(dp.get("phone") or "").strip()
            elif isinstance(dp, str):
                dp_id = dp

            ord_dpid = str(o.get("delivery_partner_id") or "")
            ord_phone = str(o.get("delivery_partner_phone") or "").strip()

            if (
                (p_id and (p_id == dp_id or p_id == ord_dpid))
                or (p_phone and (p_phone == dp_phone or p_phone == ord_phone))
            ):
                matching.append(o)

        orders_completed = len(matching)
        cod_collected = round(
            sum(
                float(o.get("total_amount") or o.get("total") or 0.0)
                for o in matching
                if str(o.get("payment_method") or "").lower() == "cod"
            ),
            2,
        )
        wages_earned = round(orders_completed * 20.0, 2)
        net_cash_due = max(0.0, round(cod_collected - wages_earned, 2))

        # Check partner's recorded live values if matching orders is 0
        if orders_completed == 0 and float(partner.get("cash_in_hand") or 0.0) > 0:
            cod_collected = float(partner.get("cash_in_hand") or 0.0)
            wages_earned = float(partner.get("total_payout_earned") or 0.0)
            net_cash_due = float(
                partner.get("net_cash_due")
                if partner.get("net_cash_due") is not None
                else max(0.0, cod_collected - wages_earned)
            )

        is_locked = net_cash_due >= 500.0 or bool(partner.get("is_locked", False))
        if is_locked:
            status = "LOCKED"
            locked_count += 1
        elif net_cash_due >= 400.0:
            status = "APPROACHING_LIMIT"
        else:
            status = "ACTIVE"

        total_cod += cod_collected
        total_wages += wages_earned
        total_due += net_cash_due

        courier_results.append({
            "id": p_id,
            "name": p_name,
            "phone": p_phone,
            "email": partner.get("email") or "",
            "vehicle": partner.get("vehicle") or partner.get("vehicle_type") or "Bike",
            "orders_completed": orders_completed,
            "cod_collected": cod_collected,
            "wages_earned": wages_earned,
            "net_cash_due_to_admin": net_cash_due,
            "is_locked": is_locked,
            "status": status,
            "remittance_status": "DUES_PENDING" if net_cash_due > 0 else "CLEAR",
            "settlement_date": date_prefix,
            # Standard non-null financial attributes
            "items_subtotal": 0.0,
            "gst": 0.0,
            "delivery_fee": float(wages_earned),
            "platform_fee": 0.0,
            "commission_amount": 0.0,
            "net_payout": float(wages_earned),
            "total_amount": float(cod_collected),
        })

    return {
        "couriers": courier_results,
        "riders": courier_results,
        "summary": {
            "total_cod_collected": round(total_cod, 2),
            "total_wages_earned": round(total_wages, 2),
            "net_cash_due_to_admin": round(total_due, 2),
            "locked_couriers_count": locked_count,
        },
        "date": date_prefix,
    }


@router.post("/settlements/couriers/{courier_id}/remit")
@router.post("/settlements/couriers/{courier_id}/acknowledge-remittance")
async def acknowledge_courier_settlement_remittance(
    courier_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
    payload: dict | None = None,
):
    """
    Admin acknowledges courier physical cash remittance, clearing or reducing physical CIH.
    """
    from datetime import datetime as dt, timezone as dt_tz
    admin_email = (
        current_user.get("email") or current_user.get("sub") or "admin@campusbite.in"
    ).strip().lower()

    payload = payload or {}
    query = _id_filter(courier_id)
    partner_doc = await database["delivery_partners"].find_one(query)
    if not partner_doc:
        partner_doc = await database["delivery_partners"].find_one({"phone": courier_id})

    if not partner_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier partner not found",
        )

    amount = float(payload.get("amount") or 0.0)
    utr = str(payload.get("utr") or f"CASH/{dt.now().strftime('%Y%m%d%H%M%S')}")

    current_cih = float(partner_doc.get("cash_in_hand") or 0.0)
    current_earned = float(partner_doc.get("total_payout_earned") or 0.0)
    current_due = float(
        partner_doc.get("net_cash_due")
        if partner_doc.get("net_cash_due") is not None
        else max(0.0, current_cih - current_earned)
    )

    remit_amount = amount if amount > 0 else current_due
    new_cih = max(0.0, current_cih - remit_amount)
    new_due = max(0.0, new_cih - current_earned)
    is_locked = new_due >= 500.00
    total_remitted = float(partner_doc.get("total_remitted") or 0.0) + remit_amount

    await database["delivery_partners"].update_one(
        {"_id": partner_doc["_id"]},
        {
            "$set": {
                "cash_in_hand": round(new_cih, 2),
                "net_cash_due": round(new_due, 2),
                "total_remitted": round(total_remitted, 2),
                "is_locked": is_locked,
            }
        },
    )

    remittance_record = {
        "rider_id": str(partner_doc["_id"]),
        "rider_name": partner_doc.get("name") or "",
        "rider_phone": partner_doc.get("phone") or "",
        "amount": remit_amount,
        "utr": utr,
        "approved_by": admin_email,
        "approved_at": dt.now(dt_tz.utc).isoformat(),
        "status": "APPROVED",
    }
    await database["rider_remittances"].insert_one(remittance_record)

    await log_admin_action(
        admin_email=admin_email,
        action="acknowledge_courier_remittance",
        resource="delivery_partners",
        resource_id=str(partner_doc["_id"]),
        metadata={"amount": remit_amount, "utr": utr, "new_due": new_due},
    )

    return {
        "success": True,
        "message": f"Remittance of ₹{remit_amount:.2f} acknowledged for {partner_doc.get('name')}",
        "net_cash_due": round(new_due, 2),
        "is_locked": is_locked,
    }


@router.get("/settlements/daily-summary")
@router.get("/canteen-settlements/daily-summary")
async def get_canteen_daily_settlement_summary_endpoint(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    date: Annotated[str | None, Query()] = None,
):
    """
    Returns aggregated daily settlement summary for all canteens for the 9:00 PM batch run.
    """
    from app.services.settlement_service import get_daily_canteen_settlement_summary
    return await get_daily_canteen_settlement_summary(target_date=date)


@router.post("/settlements/trigger-payout")
@router.post("/canteen-settlements/trigger-payout")
async def trigger_canteen_batch_payout_endpoint(
    payload: dict,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """
    Executes and records the 9:00 PM batch payout confirmation for canteens.
    """
    from app.services.settlement_service import trigger_canteen_batch_payout
    admin_email = (
        current_user.get("email") or current_user.get("sub") or "admin@campusbite.in"
    ).strip().lower()

    settlement_date = payload.get("settlement_date")
    batch_reference = payload.get("batch_reference") or payload.get("transaction_ref") or payload.get("utr")
    restaurant_emails = payload.get("restaurant_emails")

    result = await trigger_canteen_batch_payout(
        settlement_date=settlement_date,
        batch_reference=batch_reference,
        restaurant_emails=restaurant_emails,
        admin_email=admin_email,
    )

    await log_admin_action(
        admin_email=admin_email,
        action="trigger_canteen_9pm_payout",
        resource="canteen_settlements",
        resource_id=settlement_date or "today",
        metadata=result,
    )

    return result


@router.get("/settlements/{canteen_id}/export")
@router.get("/canteen-settlements/{canteen_id}/export")
async def export_canteen_settlement_endpoint(
    canteen_id: str,
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    date: Annotated[str | None, Query()] = None,
    format: Annotated[str, Query()] = "csv",
):
    """
    Generates downloadable CSV or JSON daily settlement summary for a canteen.
    """
    from fastapi.responses import PlainTextResponse
    from app.services.settlement_service import generate_canteen_settlement_export

    result = await generate_canteen_settlement_export(
        canteen_id_or_email=canteen_id,
        target_date=date,
        format_type=format,
    )

    if format.lower() == "json":
        return result

    return PlainTextResponse(
        content=result,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=settlement_{canteen_id}_{date or 'today'}.csv"
        },
    )


@router.post("/canteen-settlements")
async def record_canteen_settlement(
    payload: dict,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """
    Records a completed 9:00 PM consolidated UPI daily settlement for a canteen/restaurant.
    """
    import datetime

    admin_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    restaurant_email = payload.get("restaurant_email") or ""
    restaurant_name = payload.get("restaurant_name") or ""
    settlement_date = payload.get("settlement_date") or datetime.date.today().isoformat()
    amount = float(payload.get("amount") or 0.0)
    orders_count = int(payload.get("orders_count") or 0)
    transaction_ref = payload.get("transaction_ref") or f"UPI/{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    upi_id = payload.get("upi_id") or ""

    record = {
        "restaurant_email": restaurant_email,
        "restaurant_name": restaurant_name,
        "settlement_date": settlement_date,
        "amount": amount,
        "net_payable_subtotal": amount,
        "net_disbursed": amount,
        "orders_count": orders_count,
        "transaction_ref": transaction_ref,
        "upi_id": upi_id,
        "settled_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "settled_by": admin_email,
        "status": "Settled",
    }

    # Upsert daily settlement record
    await database["canteen_settlements"].update_one(
        {
            "restaurant_email": restaurant_email,
            "settlement_date": settlement_date,
        },
        {"$set": record},
        upsert=True,
    )

    await log_admin_action(
        admin_email=admin_email,
        action="settle_canteen_daily_upi",
        resource="canteen_settlements",
        resource_id=restaurant_email,
        metadata={
            "restaurant_email": restaurant_email,
            "amount": amount,
            "transaction_ref": transaction_ref,
            "settlement_date": settlement_date,
        },
    )

    return {
        "success": True,
        "message": f"Settlement recorded for {restaurant_name or restaurant_email}",
        "settlement": record,
    }


@router.get("/settlements")
@router.get("/canteen-settlements")
async def list_canteen_settlements(
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
    date: Annotated[str | None, Query()] = None,
):
    """
    Lists canteen daily settlement records.
    """
    role = current_user.get("role")
    user_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    query = {}
    if role == RESTAURANT_OWNER:
        query["restaurant_email"] = user_email
    if date:
        query["settlement_date"] = date

    cursor = database["canteen_settlements"].find(query).sort("settled_at", -1)
    settlements = []
    async for doc in cursor:
        doc["_id"] = str(doc.get("_id", ""))
        settlements.append(doc)

    return {"settlements": settlements}


@router.get("/riders/cih-oversight")
async def get_rider_cih_oversight(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """
    Returns platform-wide Courier Cash-in-Hand (CIH) oversight records with hard lockout detection.
    Computes status:
      - LOCKED: net_cash_due >= 500.00
      - APPROACHING_LIMIT: net_cash_due >= 400.00 and net_cash_due < 500.00
      - ACTIVE: net_cash_due < 400.00
    """
    cursor = database["delivery_partners"].find({}).sort("name", 1)
    partners = await cursor.to_list(None)

    total_cash_collected = 0.0
    total_wages_kept = 0.0
    total_cih_held = 0.0
    locked_count = 0
    approaching_count = 0
    active_count = 0

    rider_records = []
    for doc in partners:
        phone = doc.get("phone") or ""
        doc_id = str(doc.get("_id", ""))
        name = doc.get("name") or doc.get("full_name") or "Courier"
        email = doc.get("email") or ""
        vehicle = doc.get("vehicle") or doc.get("vehicle_type") or "Bike"
        vehicle_number = doc.get("vehicle_number") or ""

        cash_collected = float(doc.get("cash_in_hand") or 0.0)
        wages_kept = float(doc.get("total_payout_earned") or 0.0)

        if doc.get("net_cash_due") is not None:
            net_due = float(doc.get("net_cash_due") or 0.0)
        else:
            net_due = max(0.0, cash_collected - wages_kept)

        is_locked = net_due >= 500.00
        excess_amount = max(0.0, net_due - 500.00)

        if is_locked:
            cih_status = "LOCKED"
            locked_count += 1
        elif net_due >= 400.00:
            cih_status = "APPROACHING_LIMIT"
            approaching_count += 1
        else:
            cih_status = "ACTIVE"
            active_count += 1

        total_cash_collected += cash_collected
        total_wages_kept += wages_kept
        total_cih_held += net_due

        rider_records.append({
            "id": doc_id,
            "name": name,
            "phone": phone,
            "email": email,
            "vehicle": vehicle,
            "vehicle_number": vehicle_number,
            "orders_delivered": int(
                doc.get("total_deliveries")
                or doc.get("completed_orders")
                or doc.get("completed_deliveries")
                or 0
            ),
            "cash_collected": round(cash_collected, 2),
            "wages_kept": round(wages_kept, 2),
            "net_cash_due": round(net_due, 2),
            "net_due": round(net_due, 2),
            "max_limit": 500.00,
            "is_locked": is_locked,
            "excess_amount": round(excess_amount, 2),
            "status": cih_status,
            "remittance_status": "DUES_PENDING" if net_due > 0 else "CLEAR",
            "approved_remittances": float(doc.get("total_remitted") or 0.0),
        })

    return {
        "total_cash_collected": round(total_cash_collected, 2),
        "total_campus_cih": round(total_cih_held, 2),
        "total_cih_held": round(total_cih_held, 2),
        "total_wages_kept": round(total_wages_kept, 2),
        "net_unremitted_dues": round(total_cih_held, 2),
        "locked_riders_count": locked_count,
        "approaching_limit_count": approaching_count,
        "active_riders_count": active_count,
        "riders": rider_records,
    }


@router.post("/riders/{rider_id}/remittance/approve")
async def approve_rider_remittance_endpoint(
    rider_id: str,
    payload: dict,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """
    Approves a courier cash remittance (UTR verification), drops net cash due,
    and unblocks the courier immediately if net_cash_due < ₹500.
    """
    import datetime

    admin_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    query = _id_filter(rider_id)
    partner_doc = await database["delivery_partners"].find_one(query)
    if not partner_doc:
        partner_doc = await database["delivery_partners"].find_one({"phone": rider_id})

    if not partner_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier partner not found",
        )

    amount = float(payload.get("amount") or 0.0)
    utr = str(payload.get("utr") or f"UPI/{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}")

    current_cih = float(partner_doc.get("cash_in_hand") or 0.0)
    current_earned = float(partner_doc.get("total_payout_earned") or 0.0)
    current_net_due = float(
        partner_doc.get("net_cash_due")
        if partner_doc.get("net_cash_due") is not None
        else max(0.0, current_cih - current_earned)
    )

    remit_amount = amount if amount > 0 else current_net_due
    new_cih = max(0.0, current_cih - remit_amount)
    new_net_due = max(0.0, new_cih - current_earned)
    is_locked = new_net_due >= 500.00
    excess_amount = max(0.0, new_net_due - 500.00)

    total_remitted = float(partner_doc.get("total_remitted") or 0.0) + remit_amount

    await database["delivery_partners"].update_one(
        {"_id": partner_doc["_id"]},
        {
            "$set": {
                "cash_in_hand": round(new_cih, 2),
                "net_cash_due": round(new_net_due, 2),
                "total_remitted": round(total_remitted, 2),
                "is_locked": is_locked,
            }
        },
    )

    remittance_record = {
        "rider_id": str(partner_doc["_id"]),
        "rider_name": partner_doc.get("name") or "",
        "rider_phone": partner_doc.get("phone") or "",
        "amount": remit_amount,
        "utr": utr,
        "approved_by": admin_email,
        "approved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "APPROVED",
    }
    await database["rider_remittances"].insert_one(remittance_record)

    await log_admin_action(
        admin_email=admin_email,
        action="approve_rider_remittance",
        resource="delivery_partners",
        resource_id=str(partner_doc["_id"]),
        metadata={
            "phone": partner_doc.get("phone"),
            "amount": remit_amount,
            "utr": utr,
            "new_net_due": new_net_due,
            "is_locked": is_locked,
        },
    )

    return {
        "success": True,
        "message": f"Remittance of ₹{remit_amount:.2f} approved (UTR: {utr}). Rider unlocked.",
        "net_cash_due": round(new_net_due, 2),
        "is_locked": is_locked,
        "excess_amount": round(excess_amount, 2),
        "status": "ACTIVE" if not is_locked else ("APPROACHING_LIMIT" if new_net_due >= 400.0 else "LOCKED"),
    }


# Subscription Endpoints Re-export
from app.routes.admin_subscription import (
    get_admin_subscriptions,
    update_subscription_payment_status,
    update_subscription_status,
    delete_admin_subscription,
    serialize_sub,
)



