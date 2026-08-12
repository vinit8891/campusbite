from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.db.database import database


delivery_collection = database["delivery_partners"]

OWNER_PROFILE_FIELDS = {
    "name",
    "vehicle",
    "vehicle_number",
    "profile_image",
    "online",
}


def get_object_id(partner_id: str):
    try:
        return ObjectId(partner_id)
    except InvalidId:
        return None


def serialize_partner_profile(partner: dict | None) -> dict | None:
    if not partner:
        return None

    vehicle = partner.get("vehicle") or partner.get("vehicle_type") or ""

    return {
        "id": str(partner.get("_id")),
        "name": partner.get("name") or "",
        "email": partner.get("email") or "",
        "phone": partner.get("phone") or "",
        "vehicle": vehicle,
        "vehicle_type": vehicle,
        "vehicle_number": partner.get("vehicle_number") or "",
        "profile_image": partner.get("profile_image") or "",
        "online": bool(partner.get("online", False)),
        "created_at": partner.get("created_at"),
    }


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


async def get_delivery_partner_by_id(partner_id: str):
    oid = get_object_id(partner_id)
    if not oid:
        return None
    return await delivery_collection.find_one({"_id": oid})


async def update_delivery_partner_profile(phone: str, data: dict):
    """Update only safe profile fields for the partner identified by phone."""
    payload = {
        key: value
        for key, value in data.items()
        if key in OWNER_PROFILE_FIELDS and value is not None
    }

    if not payload:
        return False

    result = await delivery_collection.update_one(
        {"phone": phone},
        {"$set": payload},
    )
    return result.matched_count == 1


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
