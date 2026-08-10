from datetime import datetime

from app.db.database import database


delivery_collection = database["delivery_partners"]


# ==========================================
# Delivery Partner Authentication
# ==========================================

async def create_delivery_partner(data: dict):
    data = data.copy()

    data["online"] = False
    data["created_at"] = datetime.utcnow()

    result = await delivery_collection.insert_one(data)

    return str(result.inserted_id)


async def get_delivery_partner_by_email(email: str):
    return await delivery_collection.find_one(
        {"email": email}
    )


async def get_delivery_partner_by_phone(phone: str):
    return await delivery_collection.find_one(
        {"phone": phone}
    )


# ==========================================
# Delivery Partner Status
# ==========================================

async def update_status(
    phone: str,
    online: bool
):
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
        "online": partner.get(
            "online",
            False
        )
    }