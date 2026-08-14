from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.core.audit import log_admin_action
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email, sanitize_search_query
from app.schemas.restaurant import Restaurant
from app.models.restaurant import (
    create_restaurant,
    get_all_restaurants,
    get_restaurant_by_id,
    update_restaurant,
    delete_restaurant,
)

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

logger = get_logger(__name__)

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
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    logger.info("restaurants.create request received")
    restaurant_data = restaurant.model_dump(exclude_none=True)

    restaurant_id = await create_restaurant(restaurant_data)

    await log_admin_action(
        admin_email=current_user.get("email") or "",
        action="restaurant.create",
        resource="restaurant",
        resource_id=restaurant_id,
    )

    logger.info("restaurants.create completed successfully")
    return {
        "message": "Restaurant added successfully",
        "id": restaurant_id,
    }


@router.get("/")
async def fetch_restaurants(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    email: Annotated[str | None, Query()] = None,
    slug: Annotated[str | None, Query()] = None,
    include_menu: Annotated[bool, Query()] = True,
):
    logger.info("restaurants.list request received")
    result = await get_all_restaurants(
    page=page,
    limit=limit,
    q=sanitize_search_query(q),
    category=(category.strip().lower() if category else None),
    email=sanitize_email(email),
    slug=(slug.strip() if slug else None),
    include_menu=include_menu,
)
    logger.info("restaurants.list completed successfully")
    return result


@router.put("/{restaurant_id}")
async def edit_restaurant(
    restaurant_id: str,
    restaurant: Restaurant,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
):
    logger.info("restaurants.update request received")
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

    if role == ADMIN:
        await log_admin_action(
            admin_email=current_user.get("email") or "",
            action="restaurant.update",
            resource="restaurant",
            resource_id=restaurant_id,
        )

    logger.info("restaurants.update completed successfully")
    return {
        "message": "Restaurant updated successfully"
    }


@router.delete("/{restaurant_id}")
async def remove_restaurant(
    restaurant_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    logger.info("restaurants.delete request received")
    deleted = await delete_restaurant(restaurant_id)

    if deleted == 0:
        return {
            "message": "Restaurant not found"
        }

    await log_admin_action(
        admin_email=current_user.get("email") or "",
        action="restaurant.delete",
        resource="restaurant",
        resource_id=restaurant_id,
    )

    logger.info("restaurants.delete completed successfully")
    return {
        "message": "Restaurant deleted successfully"
    }
