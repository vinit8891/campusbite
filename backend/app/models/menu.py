from app.db.database import database

menu_collection = database["menu"]


async def create_menu_item(data):
    result = await menu_collection.insert_one(data)
    return str(result.inserted_id)


async def get_menu(email: str):
    items = []

    async for item in menu_collection.find(
        {
            "restaurant_email": email
        }
    ):
        item["_id"] = str(item["_id"])
        items.append(item)

    return items