from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
from app.schemas.restaurant import Restaurant
from app.models.restaurant import (
    create_restaurant,
    get_all_restaurants,
    update_restaurant,
    delete_restaurant,
)

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


@router.post("/")
async def add_restaurant(
    restaurant: Restaurant,
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    restaurant_data = restaurant.model_dump()

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
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    data = restaurant.model_dump()

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
