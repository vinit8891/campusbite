from fastapi import APIRouter

from app.schemas.menu import MenuItem

from app.models.menu import (
    create_menu_item,
    get_menu,
    delete_menu_item,
    get_single_menu_item,
    update_menu_item,
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


@router.get("/item/{item_id}")
async def fetch_single(item_id: str):
    return await get_single_menu_item(item_id)


@router.put("/{item_id}")
async def update_item(
    item_id: str,
    item: MenuItem,
):
    await update_menu_item(
        item_id,
        item.model_dump(),
    )

    return {
        "message": "Updated Successfully"
    }


@router.delete("/{item_id}")
async def remove_menu(item_id: str):

    deleted = await delete_menu_item(
        item_id
    )

    if deleted == 0:
        return {
            "message": "Item not found"
        }

    return {
        "message": "Deleted successfully"
    }