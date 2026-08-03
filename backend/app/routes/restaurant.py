from fastapi import APIRouter
from app.schemas.restaurant import Restaurant
from app.models.restaurant import (
    create_restaurant,
    get_all_restaurants,
    update_restaurant,
    delete_restaurant,
)

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


@router.post("/")
async def add_restaurant(restaurant: Restaurant):
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
):
    data = restaurant.model_dump()

    await update_restaurant(restaurant_id, data)

    return {
        "message": "Restaurant updated successfully"
    }


@router.delete("/{restaurant_id}")
async def remove_restaurant(restaurant_id: str):
    deleted = await delete_restaurant(restaurant_id)

    if deleted == 0:
        return {
            "message": "Restaurant not found"
        }

    return {
        "message": "Restaurant deleted successfully"
    }