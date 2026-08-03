from app.db.database import database

restaurant_owner_collection = database["restaurant_owners"]


async def create_restaurant_owner(data):
    result = await restaurant_owner_collection.insert_one(data)
    return str(result.inserted_id)


async def get_owner_by_email(email: str):
    return await restaurant_owner_collection.find_one(
        {"email": email}
    )