from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth.auth import require_roles
from app.auth.roles import ADMIN, CUSTOMER
from app.schemas.review import Review

from app.models.review import (
    create_review,
    get_restaurant_reviews,
    restaurant_average,
    delivery_average,
    review_exists,
)

from app.db.database import database

# Mongo Collections
order_collection = database["orders"]

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"],
)


# ----------------------------------------
# Submit Review
# ----------------------------------------
@router.post("/")
async def add_review(
    review: Review,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER, ADMIN))],
):
    data = review.model_dump()

    # Prevent duplicate reviews
    already_reviewed = await review_exists(
        data["order_id"]
    )

    if already_reviewed:
        raise HTTPException(
            status_code=400,
            detail="Review already submitted.",
        )

    if current_user.get("role") == CUSTOMER:
        if current_user.get("full_name"):
            data["customer_name"] = current_user["full_name"]

    data["created_at"] = datetime.utcnow()

    review_id = await create_review(data)

    # Mark order as reviewed
    await order_collection.update_one(
        {
            "_id": data["order_id"],
        },
        {
            "$set": {
                "review_submitted": True,
            }
        },
    )

    return {
        "message": "Review Submitted Successfully",
        "id": review_id,
    }


# ----------------------------------------
# Restaurant Reviews
# ----------------------------------------
@router.get("/restaurant/{email}")
async def restaurant_reviews(email: str):
    return await get_restaurant_reviews(email)


# ----------------------------------------
# Restaurant Rating
# ----------------------------------------
@router.get("/restaurant/rating/{email}")
async def restaurant_rating(email: str):
    return await restaurant_average(email)


# ----------------------------------------
# Delivery Partner Rating
# ----------------------------------------
@router.get("/delivery/rating/{phone}")
async def partner_rating(phone: str):
    return await delivery_average(phone)
