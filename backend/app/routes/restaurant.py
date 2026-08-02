from fastapi import APIRouter

from app.schemas.restaurant import Restaurant
from app.models.restaurant import (
    create_restaurant,
    get_all_restaurants,
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