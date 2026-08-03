from fastapi import APIRouter

from app.schemas.menu import MenuItem

from app.models.menu import (
    create_menu_item,
    get_menu,
)

router = APIRouter(
    prefix="/menu",
    tags=["Restaurant Menu"],
)


@router.post("/")
async def add_menu(item: MenuItem):

    item_id = await create_menu_item(
        item.model_dump()
    )

    return {
        "message": "Menu item added",
        "id": item_id,
    }


@router.get("/{email}")
async def fetch_menu(email: str):
    return await get_menu(email)