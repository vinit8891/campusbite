from app.db.database import database

delivery_collection = database["delivery_partners"]


async def update_status(phone: str, online: bool):
    await delivery_collection.update_one(
        {"phone": phone},
        {
            "$set": {
                "online": online
            }
        },
        upsert=True,
    )

    return True


async def get_status(phone: str):
    partner = await delivery_collection.find_one(
        {"phone": phone}
    )

    if not partner:
        return {
            "online": False
        }

    return {
        "online": partner.get("online", False)
    }