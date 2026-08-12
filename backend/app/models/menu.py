import re

from bson import ObjectId

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
    limit: int = 100,
):
    """Restaurant menu items with optional filters. Newest/insertion order preserved via _id desc."""
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

    safe_limit = max(1, min(int(limit or 100), 200))

    items = []
    cursor = menu_collection.find(query).sort("_id", -1).limit(safe_limit)

    async for item in cursor:
        item["_id"] = str(item["_id"])
        items.append(item)

    return items


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
