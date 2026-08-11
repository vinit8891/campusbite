from fastapi import APIRouter, HTTPException

from app.schemas.restaurant_owner import RestaurantOwner
from app.models.restaurant_owner import (
    create_restaurant_owner,
    get_owner_by_email,
)

from app.auth.roles import RESTAURANT_OWNER
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(
    prefix="/restaurant-owner",
    tags=["Restaurant Owner"],
)


@router.post("/register")
async def register_owner(owner: RestaurantOwner):

    existing = await get_owner_by_email(
        owner.email
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    data = owner.model_dump()

    data["password"] = hash_password(
        owner.password
    )

    owner_id = await create_restaurant_owner(
        data
    )

    return {
        "message": "Restaurant Owner Registered",
        "id": owner_id,
    }


@router.post("/login")
async def login_owner(data: dict):

    owner = await get_owner_by_email(
        data["email"]
    )

    if not owner:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    if not verify_password(
        data["password"],
        owner["password"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    token = create_access_token(
        {
            "sub": owner["email"],
            "email": owner["email"],
            "phone": owner.get("phone"),
            "owner_name": owner.get("owner_name"),
            "restaurant_name": owner.get("restaurant_name"),
            "role": RESTAURANT_OWNER,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "owner_name": owner["owner_name"],
        "restaurant_name": owner["restaurant_name"],
        "email": owner["email"],
    }
