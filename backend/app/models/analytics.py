from collections import Counter

from app.db.database import database

order_collection = database["orders"]


async def best_selling_foods(email: str):
    foods = Counter()

    async for order in order_collection.find(
        {
            "restaurant_email": email,
            "status": "Delivered",
        }
    ):

        for item in order["items"]:
            foods[item["name"]] += item["quantity"]

    result = []

    for name, quantity in foods.most_common(5):
        result.append(
            {
                "name": name,
                "orders": quantity,
            }
        )

    return result