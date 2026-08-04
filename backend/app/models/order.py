from bson import ObjectId

from app.db.database import database

order_collection = database["orders"]


async def create_order(data):
    result = await order_collection.insert_one(data)
    return str(result.inserted_id)


async def get_orders():
    orders = []

    async for order in order_collection.find():
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


async def get_restaurant_orders(email: str):
    orders = []

    async for order in order_collection.find(
        {"restaurant_email": email}
    ):
        order["_id"] = str(order["_id"])
        orders.append(order)

    return orders


async def update_order_status(order_id: str, status: str):
    result = await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": status
            }
        }
    )

    return result.modified_count