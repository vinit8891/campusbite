from bson import ObjectId
from app.db.database import database


restaurant_collection = database["restaurants"]
menu_collection = database["menu"]


# Create Restaurant
async def create_restaurant(data):
    result = await restaurant_collection.insert_one(data)
    return str(result.inserted_id)


# Get All Restaurants
async def get_all_restaurants():
    restaurants = []

    async for restaurant in restaurant_collection.find():

        restaurant["_id"] = str(restaurant["_id"])

        # Get restaurant menu
        email = restaurant.get("email")

        menu_items = []

        if email:
            async for item in menu_collection.find(
                {
                    "restaurant_email": email
                }
            ):
                item["_id"] = str(item["_id"])

                menu_items.append(item)

        restaurant["menu"] = menu_items

        restaurants.append(restaurant)

    return restaurants


# Update Restaurant
async def update_restaurant(
    restaurant_id,
    data
):
    await restaurant_collection.update_one(
        {
            "_id": ObjectId(restaurant_id)
        },
        {
            "$set": data
        }
    )


# Delete Restaurant
async def delete_restaurant(
    restaurant_id
):
    result = await restaurant_collection.delete_one(
        {
            "_id": ObjectId(restaurant_id)
        }
    )

    return result.deleted_count 