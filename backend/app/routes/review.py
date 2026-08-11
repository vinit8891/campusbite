from datetime import datetime
from typing import Annotated

from bson import ObjectId
from bson.errors import InvalidId
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
from app.models.order import get_order_by_id

from app.db.database import database

order_collection = database["orders"]

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"],
)


def _customer_owns_order(order: dict, user: dict) -> bool:
    customer_id = user.get("sub")
    if (
        customer_id
        and order.get("customer_id")
        and str(order.get("customer_id")) == str(customer_id)
    ):
        return True

    token_email = user.get("email")
    if (
        token_email
        and order.get("customer_email")
        and str(token_email).lower()
        == str(order.get("customer_email")).lower()
    ):
        return True

    token_phone = user.get("phone")
    if token_phone and str(token_phone) == str(order.get("phone")):
        return True

    return False


@router.post("/")
async def add_review(
    review: Review,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER, ADMIN))],
):
    data = review.model_dump()

    order = await get_order_by_id(data["order_id"])

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    if current_user.get("role") == CUSTOMER:
        if not _customer_owns_order(order, current_user):
            raise HTTPException(
                status_code=403,
                detail="You can only review your own orders.",
            )

    if order.get("status") != "Delivered":
        raise HTTPException(
            status_code=400,
            detail="Reviews can only be submitted for delivered orders.",
        )

    if order.get("review_submitted") or await review_exists(data["order_id"]):
        raise HTTPException(
            status_code=400,
            detail="Review already submitted.",
        )

    # Bind review to the real order identity — do not trust client values
    data["restaurant_email"] = order.get("restaurant_email")
    partner = order.get("delivery_partner") or {}
    data["delivery_partner_phone"] = partner.get("phone") or data.get(
        "delivery_partner_phone", ""
    )

    if current_user.get("role") == CUSTOMER:
        if current_user.get("full_name"):
            data["customer_name"] = current_user["full_name"]
        if current_user.get("email"):
            data["customer_email"] = current_user["email"]
        if current_user.get("sub"):
            data["customer_id"] = str(current_user["sub"])

    data["created_at"] = datetime.utcnow()

    review_id = await create_review(data)

    try:
        oid = ObjectId(data["order_id"])
    except InvalidId:
        raise HTTPException(
            status_code=400,
            detail="Invalid order id.",
        )

    await order_collection.update_one(
        {"_id": oid},
        {"$set": {"review_submitted": True}},
    )

    return {
        "message": "Review Submitted Successfully",
        "id": review_id,
    }


@router.get("/restaurant/{email}")
async def restaurant_reviews(email: str):
    return await get_restaurant_reviews(email)


@router.get("/restaurant/rating/{email}")
async def restaurant_rating(email: str):
    return await restaurant_average(email)


@router.get("/delivery/rating/{phone}")
async def partner_rating(phone: str):
    return await delivery_average(phone)
