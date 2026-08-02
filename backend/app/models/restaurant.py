from app.db.database import database


restaurant_collection = database["restaurants"]


async def create_restaurant(data: dict):
    result = await restaurant_collection.insert_one(data)
    return str(result.inserted_id)


async def get_all_restaurants():
    restaurants = []

    async for restaurant in restaurant_collection.find():
        restaurant["_id"] = str(restaurant["_id"])
        restaurants.append(restaurant)

    return restaurants