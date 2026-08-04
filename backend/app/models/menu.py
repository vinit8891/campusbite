from bson import ObjectId

from app.db.database import database

menu_collection = database["menu"]


async def create_menu_item(data):
    result = await menu_collection.insert_one(data)
    return str(result.inserted_id)


async def get_menu(email: str):
    items = []

    async for item in menu_collection.find(
        {"restaurant_email": email}
    ):
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