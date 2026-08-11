from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.models.dashboard import get_dashboard

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/{email}")
async def dashboard(
    email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    assert_same_identity(current_user, email=email)
    return await get_dashboard(email)
