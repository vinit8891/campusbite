from fastapi import APIRouter

from app.models.dashboard import get_dashboard

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/{email}")
async def dashboard(email: str):
    return await get_dashboard(email)