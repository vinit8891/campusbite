import re

from bson import ObjectId

from app.core.pagination import (
    normalize_limit,
    normalize_page,
    paginated_response,
    skip_for,
)
from app.db.database import database

menu_collection = database["menu"]


async def create_menu_item(data):
    result = await menu_collection.insert_one(data)
    return str(result.inserted_id)


async def get_menu(
    email: str,
    *,
    category: str | None = None,
    available: bool | None = None,
    q: str | None = None,
    page: int = 1,
    limit: int = 20,
):
    """Restaurant menu items with optional filters. Newest/insertion order via _id desc."""
    query: dict = {"restaurant_email": email}

    if category and category.strip():
        query["category"] = {
            "$regex": f"^{re.escape(category.strip())}$",
            "$options": "i",
        }

    if available is not None:
        query["available"] = available

    if q and q.strip():
        query["name"] = {
            "$regex": re.escape(q.strip()),
            "$options": "i",
        }

    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await menu_collection.count_documents(query)
    pages = max(1, (total + safe_limit - 1) // safe_limit) if total else 1
    meta_page = min(safe_page, pages)

    items = []
    cursor = (
        menu_collection.find(query)
        .sort("_id", -1)
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )

    async for item in cursor:
        item["_id"] = str(item["_id"])
        items.append(item)

    return paginated_response(
        items, total=total, page=meta_page, limit=safe_limit
    )


async def delete_menu_item(item_id: str):
    result = await menu_collection.delete_one(
        {"_id": ObjectId(item_id)}
    )

    return result.deleted_count


async def get_single_menu_item(item_id: str):
    item = await menu_collection.find_one(
        {"_id": ObjectId(item_id)}
    )

    if item:
        item["_id"] = str(item["_id"])

    return item


async def update_menu_item(item_id: str, data):
    result = await menu_collection.update_one(
        {"_id": ObjectId(item_id)},
        {
            "$set": data
        }
    )

    return result.modified_count
