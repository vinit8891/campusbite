from app.db.database import database

user_collection = database["users"]


async def create_user(data: dict):
    result = await user_collection.insert_one(data)
    return str(result.inserted_id)


async def get_user_by_email(email: str):
    return await user_collection.find_one(
        {"email": email}
    )