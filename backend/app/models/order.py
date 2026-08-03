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