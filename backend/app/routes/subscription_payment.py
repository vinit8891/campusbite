from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, CUSTOMER, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email
from app.models.subscription_payment import (
    get_admin_payment_summary,
    get_payments_by_customer_paginated,
    get_payments_by_restaurant_paginated,
    get_restaurant_revenue_summary,
    list_subscription_payments_admin_paginated,
)

logger = get_logger(__name__)

customer_router = APIRouter(
    prefix="/subscriptions/payments",
    tags=["Subscription Payments"],
)
admin_router = APIRouter(
    prefix="/admin/subscription-payments",
    tags=["Admin Subscription Payments"],
)
restaurant_router = APIRouter(
    prefix="/restaurant/subscription-payments",
    tags=["Restaurant Subscription Payments"],
)


def _customer_email(user: dict) -> str:
    from fastapi import HTTPException

    email = sanitize_email(user.get("email"))
    if not email:
        raise HTTPException(status_code=400, detail="Customer email missing from token")
    return email


@customer_router.get("/my")
async def my_subscription_payments(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
    subscription_id: Annotated[str | None, Query()] = None,
):
    customer_email = _customer_email(current_user)
    return await get_payments_by_customer_paginated(
        customer_email,
        page=page,
        limit=limit,
        subscription_id=subscription_id,
    )


@admin_router.get("/summary")
async def admin_subscription_payment_summary(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    return await get_admin_payment_summary()


@admin_router.get("/")
async def admin_subscription_payments(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    q: Annotated[str | None, Query()] = None,
    payment_status: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
    customer_email: Annotated[str | None, Query()] = None,
    subscription_id: Annotated[str | None, Query()] = None,
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
):
    return await list_subscription_payments_admin_paginated(
        q=q,
        payment_status=payment_status,
        restaurant_email=sanitize_email(restaurant_email),
        customer_email=sanitize_email(customer_email),
        subscription_id=subscription_id,
        page=page,
        limit=limit,
    )


@restaurant_router.get("/{restaurant_email}/summary")
async def restaurant_subscription_revenue_summary(
    restaurant_email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    assert_same_identity(current_user, email=restaurant_email)
    return await get_restaurant_revenue_summary(restaurant_email)


@restaurant_router.get("/{restaurant_email}")
async def restaurant_subscription_payments(
    restaurant_email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
    page: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
):
    assert_same_identity(current_user, email=restaurant_email)
    return await get_payments_by_restaurant_paginated(
        restaurant_email,
        page=page,
        limit=limit,
    )
