
from datetime import datetime, UTC
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
    ).sort("delivery_partner.accepted_at", -1):
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
    partner_vehicle: str = "",
):
    oid = get_object_id(order_id)

    if not oid:
        return False

    result = await order_collection.update_one(
        {
            "_id": oid,
            "status": {
                "$in": [
                    "Ready for Pickup",
                ]
            },
            "delivery_partner": {
                "$exists": False
            },
        },
        {
            "$set": {
                "status": "Assigned",

                "delivery_partner.name": partner_name,
                "delivery_partner.phone": partner_phone,
                "delivery_partner.vehicle": partner_vehicle,

                "delivery_partner.latitude": None,
                "delivery_partner.longitude": None,

                "delivery_partner.accepted_at": datetime.now(UTC),
                "delivery_partner.last_location_update": None,
            }
        },
    )

    return result.modified_count == 1


# -----------------------------
# Update Status
# -----------------------------
# -----------------------------
# Update Status
# -----------------------------
async def update_order_status(
    order_id: str,
    status: str,
    delivery_partner=None,
):
    oid = get_object_id(order_id)

    print("========== UPDATE STATUS ==========")
    print("Order ID:", order_id)
    print("Requested Status:", status)

    if not oid:
        return False

    order = await order_collection.find_one({"_id": oid})

    if not order:
        return False

    current_status = order["status"]

    print("Current:", current_status)

    # Restaurant cannot mark Delivered
    if status == "Delivered":
        return False

    # Prevent updating to same status
    if current_status == status:
        return True

    # Allowed status transitions
    allowed = {
        "Pending": ["Accepted", "Cancelled"],
        "Placed": ["Accepted", "Cancelled"],
        "Accepted": ["Preparing", "Cancelled"],
        "Preparing": ["Ready for Pickup", "Cancelled"],
        "Ready for Pickup": [],
        "Assigned": ["Picked Up"],
        "Picked Up": ["Out for Delivery"],
        "Out for Delivery": [],
    }

    if status not in allowed.get(current_status, []):
        print("Invalid transition")
        return False

    update_data = {
        "status": status
    }

    if delivery_partner:
        update_data["delivery_partner"] = delivery_partner

    result = await order_collection.update_one(
        {"_id": oid},
        {
            "$set": update_data
        }
    )

    print("Matched:", result.matched_count)
    print("Modified:", result.modified_count)
    print("==============================")

    return result.matched_count > 0


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
        return False

    result = await order_collection.update_one(
        {
            "_id": oid,
            "status": {
               "$in": [
                        "Assigned",
                        "Picked Up",
                        "Out for Delivery",
                    ]
            },
        },
        {
            "$set": {
                "delivery_partner.latitude": latitude,
                "delivery_partner.longitude": longitude,
            },
            "$currentDate": {
                "delivery_partner.last_location_update": True
            },
        },
    )

    return result.modified_count == 1


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

        "last_location_update": partner.get("last_location_update"),

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
        {"_id": oid},
        {
            "delivery_otp": 1,
            "otp_verified": 1,
            "status": 1,
        },
    )

    if not order:
        return None

    return {
        "otp": order.get("delivery_otp"),
        "verified": order.get("otp_verified", False),
        "status": order.get("status"),
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

    # =============================
    # OTP DEBUG
    # =============================
    print("========== OTP DEBUG ==========")
    print("Status:", order.get("status"))
    print("Stored OTP:", repr(str(order.get("delivery_otp", "")).strip()))
    print("Entered OTP:", repr(str(otp).strip()))
    print("OTP Verified:", order.get("otp_verified"))
    print("===============================")

    # Only allow OTP verification when the order is out for delivery
    if order.get("status") != "Out for Delivery":
        return False

    # Already delivered
    if order.get("otp_verified"):
        return False

    stored_otp = str(order.get("delivery_otp", "")).strip()
    entered_otp = str(otp).strip()

    if stored_otp != entered_otp:
        return False

    result = await order_collection.update_one(
        {
            "_id": oid,
            "otp_verified": False,
        },
        {
            "$set": {
                "otp_verified": True,
                "status": "Delivered",
                "delivered_at": datetime.now(UTC),
            },
            "$unset": {
                "delivery_otp": "",
            },
        },
    )

    print("Modified Count:", result.modified_count)

    return result.modified_count == 1