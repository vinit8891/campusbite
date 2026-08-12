from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.schemas.restaurant import Restaurant
from app.models.restaurant import (
    create_restaurant,
    get_all_restaurants,
    get_restaurant_by_id,
    update_restaurant,
    delete_restaurant,
)

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

OWNER_PROFILE_FIELDS = {
    "name",
    "description",
    "address",
    "phone",
    "cuisine",
    "opening_hours",
    "closing_hours",
    "image",
}


@router.post("/")
async def add_restaurant(
    restaurant: Restaurant,
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    restaurant_data = restaurant.model_dump(exclude_none=True)

    restaurant_id = await create_restaurant(restaurant_data)

    return {
        "message": "Restaurant added successfully",
        "id": restaurant_id,
    }


@router.get("/")
async def fetch_restaurants():
    return await get_all_restaurants()


@router.put("/{restaurant_id}")
async def edit_restaurant(
    restaurant_id: str,
    restaurant: Restaurant,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
):
    existing = await get_restaurant_by_id(restaurant_id)

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Restaurant not found",
        )

    role = current_user.get("role")

    if role == RESTAURANT_OWNER:
        assert_same_identity(
            current_user,
            email=existing.get("email"),
        )

        raw = restaurant.model_dump(exclude_unset=True)
        data = {
            key: value
            for key, value in raw.items()
            if key in OWNER_PROFILE_FIELDS and value is not None
        }

        if not data:
            raise HTTPException(
                status_code=400,
                detail="No profile fields to update",
            )
    else:
        # Admin: only apply provided fields so omitted profile keys stay intact
        data = restaurant.model_dump(exclude_unset=True)

    await update_restaurant(restaurant_id, data)

    return {
        "message": "Restaurant updated successfully"
    }


@router.delete("/{restaurant_id}")
async def remove_restaurant(
    restaurant_id: str,
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    deleted = await delete_restaurant(restaurant_id)

    if deleted == 0:
        return {
            "message": "Restaurant not found"
        }

    return {
        "message": "Restaurant deleted successfully"
    }
