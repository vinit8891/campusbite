from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.models.analytics import best_selling_foods

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/best-selling/{email}")
async def get_best_selling(
    email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    assert_same_identity(current_user, email=email)
    return await best_selling_foods(email)
