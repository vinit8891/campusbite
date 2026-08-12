from bson import ObjectId
from bson.errors import InvalidId
import re

from app.db.database import database


restaurant_collection = database["restaurants"]
menu_collection = database["menu"]


def _object_id(restaurant_id: str):
    try:
        return ObjectId(restaurant_id)
    except InvalidId:
        return None


# Create Restaurant
async def create_restaurant(data):
    result = await restaurant_collection.insert_one(data)
    return str(result.inserted_id)


async def get_restaurant_by_id(restaurant_id: str):
    oid = _object_id(restaurant_id)
    if not oid:
        return None

    restaurant = await restaurant_collection.find_one({"_id": oid})
    if not restaurant:
        return None

    restaurant["_id"] = str(restaurant["_id"])
    return restaurant


async def get_restaurant_by_email(email: str):
    restaurant = await restaurant_collection.find_one({"email": email})
    if not restaurant:
        return None

    restaurant["_id"] = str(restaurant["_id"])
    return restaurant


# Get All Restaurants (paginated; menus loaded only for the current page)
async def get_all_restaurants(
    *,
    page: int = 1,
    limit: int = 20,
    q: str | None = None,
    email: str | None = None,
    slug: str | None = None,
    include_menu: bool = True,
):
    from app.core.pagination import (
        normalize_limit,
        normalize_page,
        paginated_response,
        skip_for,
    )

    query: dict = {}

    if email and email.strip():
        query["email"] = {
            "$regex": f"^{re.escape(email.strip())}$",
            "$options": "i",
        }

    if slug and slug.strip():
        query["slug"] = slug.strip()

    if q and q.strip():
        term = re.escape(q.strip())
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"cuisine": {"$regex": term, "$options": "i"}},
            {"email": {"$regex": term, "$options": "i"}},
        ]

    safe_page = normalize_page(page)
    safe_limit = normalize_limit(limit, default=20)
    total = await restaurant_collection.count_documents(query)
    pages = max(1, (total + safe_limit - 1) // safe_limit) if total else 1
    meta_page = min(safe_page, pages)

    restaurants = []
    cursor = (
        restaurant_collection.find(query)
        .sort("_id", -1)
        .skip(skip_for(meta_page, safe_limit))
        .limit(safe_limit)
    )

    async for restaurant in cursor:
        restaurant["_id"] = str(restaurant["_id"])

        if include_menu:
            email_value = restaurant.get("email")
            menu_items = []
            if email_value:
                async for item in menu_collection.find(
                    {"restaurant_email": email_value}
                ):
                    item["_id"] = str(item["_id"])
                    menu_items.append(item)
            restaurant["menu"] = menu_items

        restaurants.append(restaurant)

    return paginated_response(
        restaurants, total=total, page=meta_page, limit=safe_limit
    )


# Update Restaurant
async def update_restaurant(
    restaurant_id,
    data
):
    oid = _object_id(str(restaurant_id))
    if not oid:
        return 0

    result = await restaurant_collection.update_one(
        {
            "_id": oid
        },
        {
            "$set": data
        }
    )

    return result.modified_count


# Delete Restaurant
async def delete_restaurant(
    restaurant_id
):
    oid = _object_id(str(restaurant_id))
    if not oid:
        return 0

    result = await restaurant_collection.delete_one(
        {
            "_id": oid
        }
    )

    return result.deleted_count 