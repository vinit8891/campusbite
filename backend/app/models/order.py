from bson import ObjectId
from bson.errors import InvalidId

from app.db.database import database

order_collection = database["orders"]


# -----------------------------
# Helper
# -----------------------------
def get_object_id(order_id: str):
    try:
        return ObjectId(order_id)
    except InvalidId:
        return None


# -----------------------------
# Create Order
# -----------------------------
async def create_order(data):
    result = await order_collection.insert_one(data)
    return str(result.inserted_id)


# -----------------------------
# Get All Orders
# -----------------------------
async def get_orders():
    orders = []

    async for order in order_collection.find().sort("created_at", -1):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Customer Orders
# -----------------------------
async def get_customer_orders(phone: str):
    orders = []

    async for order in order_collection.find(
        {"phone": phone}
    ).sort("created_at", -1):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Restaurant Orders
# -----------------------------
async def get_restaurant_orders(email: str):
    orders = []

    async for order in order_collection.find(
        {"restaurant_email": email}
    ).sort("created_at", -1):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Available Orders
# -----------------------------
async def get_available_orders():

    orders = []

    async for order in order_collection.find(
        {
            "status": {
                "$in": [
                    "Ready for Pickup",
                    "Ready For Pickup",
                    "Ready for pick up",
                    "Ready for Pick Up",
                ]
            }
        }
    ):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Delivered Orders
# -----------------------------
async def get_delivered_orders():

    orders = []

    async for order in order_collection.find(
        {
            "status": "Delivered"
        }
    ):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Delivery Partner Orders
# -----------------------------
async def get_delivery_orders(phone: str):

    orders = []

    async for order in order_collection.find(
        {
            "delivery_partner.phone": phone
        }
    ).sort("created_at", -1):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Assign Delivery Partner
# -----------------------------
async def assign_delivery_partner(
    order_id: str,
    partner_name: str,
    partner_phone: str,
):

    oid = get_object_id(order_id)

    if not oid:
        return 0

    result = await order_collection.update_one(
        {"_id": oid},
        {
            "$set": {
                "delivery_partner": {
                    "name": partner_name,
                    "phone": partner_phone,
                },
                "status": "Out for Delivery",
            }
        },
    )

    return result.modified_count


# -----------------------------
# Update Status
# -----------------------------
async def update_order_status(
    order_id: str,
    status: str,
    delivery_partner=None,
):

    oid = get_object_id(order_id)

    if not oid:
        return 0

    update_data = {
        "status": status
    }

    if delivery_partner:
        update_data["delivery_partner"] = delivery_partner

    result = await order_collection.update_one(
        {"_id": oid},
        {
            "$set": update_data
        },
    )

    return result.modified_count


# =====================================================
# LIVE TRACKING
# =====================================================

async def update_delivery_location(
    order_id: str,
    latitude: float,
    longitude: float,
):

    oid = get_object_id(order_id)

    if not oid:
        return 0

    result = await order_collection.update_one(
        {"_id": oid},
        {
            "$set": {
                "delivery_partner.latitude": latitude,
                "delivery_partner.longitude": longitude,
            }
        },
    )

    return result.modified_count


async def get_delivery_location(order_id: str):

    oid = get_object_id(order_id)

    if not oid:
        return None

    order = await order_collection.find_one(
        {"_id": oid}
    )

    if not order:
        return None

    partner = order.get("delivery_partner", {})

    return {
        "partner_latitude": partner.get("latitude"),
        "partner_longitude": partner.get("longitude"),
        "customer_latitude": order.get("latitude"),
        "customer_longitude": order.get("longitude"),
        "restaurant_latitude": order.get("restaurant_latitude"),
        "restaurant_longitude": order.get("restaurant_longitude"),
        "status": order.get("status"),
    }


# =====================================================
# DELIVERY OTP
# =====================================================

async def get_order_otp(order_id: str):

    oid = get_object_id(order_id)

    if not oid:
        return None

    order = await order_collection.find_one(
        {"_id": oid}
    )

    if not order:
        return None

    return {
        "otp": order.get("delivery_otp"),
        "verified": order.get("otp_verified", False),
    }


async def verify_delivery_otp(
    order_id: str,
    otp,
):

    oid = get_object_id(order_id)

    if not oid:
        return False

    order = await order_collection.find_one(
        {"_id": oid}
    )

    if not order:
        return False

    if str(order.get("delivery_otp")) != str(otp):
        return False

    await order_collection.update_one(
        {"_id": oid},
        {
            "$set": {
                "otp_verified": True,
                "status": "Delivered",
            }
        },
    )

    return True