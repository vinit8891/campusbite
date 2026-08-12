from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
from app.core.audit import log_admin_action
from app.core.logging import get_logger
from app.models.subscription_generation_state import get_generation_state
from app.schemas.admin_subscription import SubscriptionGenerateRequest
from app.services.subscription_generation_hooks import complete_subscription_generation
from app.services.subscription_order_generator import generate_subscription_orders
from app.services.subscription_scheduler import get_scheduler_status

router = APIRouter(
    prefix="/admin/subscriptions",
    tags=["Admin Subscriptions"],
)

logger = get_logger(__name__)


@router.get("/generation-status")
async def subscription_generation_status(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    state = await get_generation_state()
    scheduler = get_scheduler_status()
    return {**state, "scheduler": scheduler}


@router.post("/generate")
async def generate_subscription_orders_route(
    body: SubscriptionGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    logger.info(
        "admin.subscriptions.generate request received date=%s",
        body.target_date.isoformat(),
    )

    result = await generate_subscription_orders(body.target_date)

    await complete_subscription_generation(
        body.target_date,
        result,
        trigger="manual",
        background_tasks=background_tasks,
    )

    await log_admin_action(
        admin_email=current_user.get("email") or "",
        action="subscriptions.generate_orders",
        resource="subscription",
        resource_id=body.target_date.isoformat(),
        metadata={
            "generated_count": result["generated_count"],
            "skipped_count": result["skipped_count"],
        },
    )

    logger.info(
        "admin.subscriptions.generate completed generated=%s skipped=%s",
        result["generated_count"],
        result["skipped_count"],
    )

    return {
        "message": "Subscription order generation completed",
        "date": body.target_date.isoformat(),
        "generated_count": result["generated_count"],
        "skipped_count": result["skipped_count"],
    }
