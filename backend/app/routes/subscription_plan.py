from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, CUSTOMER, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email
from app.models.restaurant import get_restaurant_by_email
from app.models.subscription_plan import (
    create_plan,
    delete_plan,
    get_plan_by_id,
    get_plans_by_restaurant,
    update_plan,
)
from app.schemas.subscription_plan import SubscriptionPlanCreate, SubscriptionPlanUpdate

router = APIRouter(prefix="/subscription-plans", tags=["Subscription Plans"])

logger = get_logger(__name__)


@router.get("/public/{restaurant_email}")
async def public_plans(
    restaurant_email: str,
    _: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    restaurant = await get_restaurant_by_email(restaurant_email)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    items = await get_plans_by_restaurant(restaurant_email, active_only=True)
    return {"items": items}


@router.get("/{restaurant_email}")
async def restaurant_plans(
    restaurant_email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
    q: Annotated[str | None, Query()] = None,
):
    assert_same_identity(current_user, email=restaurant_email)
    items = await get_plans_by_restaurant(restaurant_email, q=q)
    return {"items": items}


@router.post("/")
async def create_plan_route(
    body: SubscriptionPlanCreate,
    current_user: Annotated[dict, Depends(require_roles(RESTAURANT_OWNER))],
):
    restaurant_email = sanitize_email(str(body.restaurant_email)) or ""
    assert_same_identity(current_user, email=restaurant_email)

    restaurant = await get_restaurant_by_email(restaurant_email)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    plan_id = await create_plan(body.model_dump())
    plan = await get_plan_by_id(plan_id)
    logger.info("subscription_plans.create completed plan_id=%s", plan_id)
    return {"message": "Subscription plan created", "plan": plan}


@router.put("/{plan_id}")
async def update_plan_route(
    plan_id: str,
    body: SubscriptionPlanUpdate,
    current_user: Annotated[dict, Depends(require_roles(RESTAURANT_OWNER))],
):
    plan = await get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    assert_same_identity(current_user, email=plan.get("restaurant_email"))
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return {"message": "No changes", "plan": plan}

    updated = await update_plan(plan_id, updates)
    if not updated:
        raise HTTPException(status_code=400, detail="Unable to update plan")

    return {
        "message": "Subscription plan updated",
        "plan": await get_plan_by_id(plan_id),
    }


@router.delete("/{plan_id}")
async def delete_plan_route(
    plan_id: str,
    current_user: Annotated[dict, Depends(require_roles(RESTAURANT_OWNER))],
):
    plan = await get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    assert_same_identity(current_user, email=plan.get("restaurant_email"))
    deleted = await delete_plan(plan_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Unable to delete plan")

    return {"message": "Subscription plan deleted"}
