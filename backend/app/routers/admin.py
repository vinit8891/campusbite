from typing import Annotated, Callable
import re

from fastapi import APIRouter, Depends, Query

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
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

