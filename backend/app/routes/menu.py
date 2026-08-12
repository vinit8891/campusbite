from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
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
async def add_menu(
    item: MenuItem,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    assert_same_identity(
        current_user,
        email=item.restaurant_email,
    )

    item_id = await create_menu_item(
        item.model_dump()
    )

    return {
        "message": "Menu item added",
        "id": item_id,
    }


@router.get("/{email}")
async def fetch_menu(
    email: str,
    category: Annotated[str | None, Query()] = None,
    available: Annotated[bool | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
):
    return await get_menu(
        email,
        category=category,
        available=available,
        q=q,
        limit=limit,
    )


@router.get("/item/{item_id}")
async def fetch_single(item_id: str):
    return await get_single_menu_item(item_id)


@router.put("/{item_id}")
async def update_item(
    item_id: str,
    item: MenuItem,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    assert_same_identity(
        current_user,
        email=item.restaurant_email,
    )

    await update_menu_item(
        item_id,
        item.model_dump(),
    )

    return {
        "message": "Updated Successfully"
    }


@router.delete("/{item_id}")
async def remove_menu(
    item_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    existing = await get_single_menu_item(item_id)

    if not existing:
        return {
            "message": "Item not found"
        }

    restaurant_email = existing.get("restaurant_email")
    if restaurant_email:
        assert_same_identity(
            current_user,
            email=restaurant_email,
        )

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
