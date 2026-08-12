from bson import ObjectId
from bson.errors import InvalidId

from app.db.database import database


restaurant_collection = database["restaurants"]
menu_collection = database["menu"]


def _object_id(restaurant_id: str):
    try:
        return ObjectId(restaurant_id)
    except InvalidId:
        return None


# Create Restaurant
async def create_restaurant(data):
    result = await restaurant_collection.insert_one(data)
    return str(result.inserted_id)


async def get_restaurant_by_id(restaurant_id: str):
    oid = _object_id(restaurant_id)
    if not oid:
        return None

    restaurant = await restaurant_collection.find_one({"_id": oid})
    if not restaurant:
        return None

    restaurant["_id"] = str(restaurant["_id"])
    return restaurant


async def get_restaurant_by_email(email: str):
    restaurant = await restaurant_collection.find_one({"email": email})
    if not restaurant:
        return None

    restaurant["_id"] = str(restaurant["_id"])
    return restaurant


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
    oid = _object_id(str(restaurant_id))
    if not oid:
        return 0

    result = await restaurant_collection.update_one(
        {
            "_id": oid
        },
        {
            "$set": data
        }
    )

    return result.modified_count


# Delete Restaurant
async def delete_restaurant(
    restaurant_id
):
    oid = _object_id(str(restaurant_id))
    if not oid:
        return 0

    result = await restaurant_collection.delete_one(
        {
            "_id": oid
        }
    )

    return result.deleted_count 