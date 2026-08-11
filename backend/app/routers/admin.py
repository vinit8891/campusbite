from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.auth import require_roles
from app.auth.roles import ADMIN

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get("/health")
async def admin_health(
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """Simple protected admin probe used for auth verification."""
    return {
        "ok": True,
        "role": current_user.get("role"),
        "email": current_user.get("email"),
    }
