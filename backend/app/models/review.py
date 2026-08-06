from app.db.database import database

# MongoDB Collection
review_collection = database["reviews"]


# ----------------------------------------
# Create Review
# ----------------------------------------
async def create_review(data: dict):
    result = await review_collection.insert_one(data)
    return str(result.inserted_id)


# ----------------------------------------
# Restaurant Reviews
# ----------------------------------------
async def get_restaurant_reviews(email: str):
    reviews = []

    async for review in review_collection.find(
        {"restaurant_email": email}
    ):
        review["_id"] = str(review["_id"])
        reviews.append(review)

    return reviews


# ----------------------------------------
# Delivery Partner Reviews
# ----------------------------------------
async def get_delivery_reviews(phone: str):
    reviews = []

    async for review in review_collection.find(
        {"delivery_partner_phone": phone}
    ):
        review["_id"] = str(review["_id"])
        reviews.append(review)

    return reviews


# ----------------------------------------
# Check Existing Review
# ----------------------------------------
async def review_exists(order_id: str):
    review = await review_collection.find_one(
        {"order_id": order_id}
    )
    return review is not None


# ----------------------------------------
# Restaurant Average Rating
# ----------------------------------------
async def restaurant_average(email: str):
    pipeline = [
        {
            "$match": {
                "restaurant_email": email
            }
        },
        {
            "$group": {
                "_id": "$restaurant_email",
                "avgRating": {
                    "$avg": "$rating"
                },
                "count": {
                    "$sum": 1
                }
            }
        }
    ]

    data = await review_collection.aggregate(pipeline).to_list(length=1)

    if not data:
        return {
            "rating": 0,
            "count": 0
        }

    return {
        "rating": round(data[0]["avgRating"], 1),
        "count": data[0]["count"]
    }


# ----------------------------------------
# Delivery Partner Average Rating
# ----------------------------------------
async def delivery_average(phone: str):
    pipeline = [
        {
            "$match": {
                "delivery_partner_phone": phone
            }
        },
        {
            "$group": {
                "_id": "$delivery_partner_phone",
                "avgRating": {
                    "$avg": "$rating"
                },
                "count": {
                    "$sum": 1
                }
            }
        }
    ]

    data = await review_collection.aggregate(pipeline).to_list(length=1)

    if not data:
        return {
            "rating": 0,
            "count": 0
        }

    return {
        "rating": round(data[0]["avgRating"], 1),
        "count": data[0]["count"]
    }