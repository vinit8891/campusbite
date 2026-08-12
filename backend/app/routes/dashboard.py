from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.models.dashboard import get_dashboard

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

logger = get_logger(__name__)


@router.get("/{email}")
async def dashboard(
    email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    logger.info("dashboard.get request received")
    assert_same_identity(current_user, email=email)
    result = await get_dashboard(email)
    logger.info("dashboard.get completed successfully")
    return result
