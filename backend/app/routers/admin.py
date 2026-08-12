from typing import Annotated, Callable
import re

from fastapi import APIRouter, Depends, Query

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
from app.core.logging import get_logger
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

    query = _text_search_filter(fields, q)
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


@router.get("/stats")
async def admin_stats(
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """Platform-wide document counts for the admin dashboard."""
    logger.info("admin.stats request received")
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
