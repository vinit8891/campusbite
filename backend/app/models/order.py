from bson import ObjectId

from app.db.database import database

order_collection = database["orders"]


# -----------------------------
# Create Order
# -----------------------------
async def create_order(data):
    result = await order_collection.insert_one(data)
    return str(result.inserted_id)


# -----------------------------
# Get All Orders (Admin)
# -----------------------------
async def get_orders():
    orders = []

    async for order in order_collection.find():
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Get Customer Orders
# -----------------------------
async def get_customer_orders(phone: str):
    orders = []

    async for order in order_collection.find(
        {"phone": phone}
    ):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Get Restaurant Orders
# -----------------------------
async def get_restaurant_orders(email: str):
    orders = []

    async for order in order_collection.find(
        {"restaurant_email": email}
    ):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


# -----------------------------
# Get Available Orders for Delivery
# -----------------------------
async def get_available_orders():
    orders = []

    async for order in order_collection.find(
        {"status": "Ready for Pickup"}
    ):
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
    result = await order_collection.update_one(
        {"_id": ObjectId(order_id)},
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
# Update Order Status
# -----------------------------
async def update_order_status(
    order_id: str,
    status: str,
):
    result = await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": status
            }
        },
    )

    return result.modified_count