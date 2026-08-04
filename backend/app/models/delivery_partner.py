from app.db.database import database

delivery_collection = database["delivery_partners"]


async def register_partner(data):
    result = await delivery_collection.insert_one(data)
    return str(result.inserted_id)


async def login_partner(email: str, password: str):
    return await delivery_collection.find_one(
        {
            "email": email,
            "password": password,
        }
    )