from fastapi import APIRouter

from app.models.analytics import best_selling_foods

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/best-selling/{email}")
async def get_best_selling(email: str):
    return await best_selling_foods(email)