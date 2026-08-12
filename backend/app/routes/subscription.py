from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, CUSTOMER, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email
from app.models.restaurant import get_restaurant_by_email
from app.models.order import get_last_subscription_order_for_customer
from app.models.subscription import (
    create_subscription,
    enrich_subscriptions_with_plans,
    get_subscription_by_id,
    get_subscriptions_by_customer,
    get_subscriptions_by_restaurant,
    list_subscriptions_admin,
    update_subscription,
)
from app.models.subscription_plan import get_plan_by_id
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionPauseRequest,
    compute_subscription_end_date,
)
from app.services.subscription_calendar import build_subscription_calendar

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

logger = get_logger(__name__)


def _customer_email(user: dict) -> str:
    email = sanitize_email(user.get("email"))
    if not email:
        raise HTTPException(status_code=400, detail="Customer email missing from token")
    return email


def _assert_subscription_access(subscription: dict, user: dict) -> None:
    role = user.get("role")
    if role == ADMIN:
        return
    if role == CUSTOMER:
        assert_same_identity(user, email=subscription.get("customer_email"))
        return
    if role == RESTAURANT_OWNER:
        assert_same_identity(user, email=subscription.get("restaurant_email"))
        return
    raise HTTPException(status_code=403, detail="Insufficient permissions")


def _ensure_mutable(subscription: dict) -> None:
    if subscription.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Subscription is cancelled")
    if subscription.get("status") == "expired":
        raise HTTPException(status_code=400, detail="Subscription is expired")


async def _resolve_subscription_payload(body: SubscriptionCreate) -> dict:
    if body.plan_id:
        plan = await get_plan_by_id(body.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")
        if not plan.get("active", True):
            raise HTTPException(status_code=400, detail="Subscription plan is not active")

        subscription_type = plan["subscription_type"]
        end_date = body.end_date or compute_subscription_end_date(
            body.start_date, subscription_type
        )
        if end_date < body.start_date:
            raise HTTPException(
                status_code=400,
                detail="end_date must be on or after start_date",
            )

        return {
            "plan_id": body.plan_id,
            "plan_name": plan.get("name"),
            "restaurant_email": plan["restaurant_email"],
            "subscription_type": subscription_type,
            "meal_type": plan["meal_type"],
            "start_date": body.start_date,
            "end_date": end_date,
            "delivery_days": plan["delivery_days"],
            "price": float(plan["price"]),
            "start_time": plan.get("start_time"),
            "end_time": plan.get("end_time"),
            "payment_status": body.payment_status,
            "auto_renew": body.auto_renew,
        }

    end_date = body.end_date
    if end_date is None:
        raise HTTPException(status_code=400, detail="end_date is required")

    return {
        "restaurant_email": str(body.restaurant_email).lower(),
        "subscription_type": body.subscription_type,
        "meal_type": body.meal_type,
        "start_date": body.start_date,
        "end_date": end_date,
        "delivery_days": body.delivery_days,
        "price": float(body.price),
        "payment_status": body.payment_status,
        "auto_renew": body.auto_renew,
    }


@router.post("/")
async def create_subscription_route(
    body: SubscriptionCreate,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    logger.info("subscriptions.create request received")
    payload = await _resolve_subscription_payload(body)

    restaurant = await get_restaurant_by_email(payload["restaurant_email"])
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    customer_email = _customer_email(current_user)
    subscription_id = await create_subscription(
        {
            "customer_email": customer_email,
            **payload,
            "status": "active",
            "skipped_dates": [],
            "pause_from": None,
            "pause_to": None,
        }
    )

    subscription = await get_subscription_by_id(subscription_id)
    logger.info("subscriptions.create completed successfully")
    return {
        "message": "Subscription created successfully",
        "subscription": subscription,
    }


@router.get("/my")
async def my_subscriptions(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    customer_email = _customer_email(current_user)
    items = await get_subscriptions_by_customer(customer_email)
    return {"items": items}


@router.get("/calendar")
async def subscription_calendar(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
    month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
):
    customer_email = _customer_email(current_user)
    items = await get_subscriptions_by_customer(customer_email)
    enriched = await enrich_subscriptions_with_plans(items)
    calendar = build_subscription_calendar(enriched, month=month)
    return calendar


@router.get("/summary")
async def subscription_summary(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    customer_email = _customer_email(current_user)
    items = await get_subscriptions_by_customer(customer_email)
    enriched = await enrich_subscriptions_with_plans(items)
    calendar = build_subscription_calendar(enriched)

    today_meal = calendar["today_meals"][0] if calendar.get("today_meals") else None
    upcoming_meal = (
        calendar["upcoming_meals"][0] if calendar.get("upcoming_meals") else None
    )

    last_order = await get_last_subscription_order_for_customer(customer_email)
    last_generated_order = None
    if last_order:
        last_generated_order = {
            "order_id": last_order.get("_id"),
            "status": last_order.get("status"),
            "payment_status": last_order.get("payment_status"),
            "subscription_order_date": last_order.get("subscription_order_date"),
            "meal_name": (
                (last_order.get("items") or [{}])[0].get("name")
                if last_order.get("items")
                else None
            ),
            "restaurant_email": last_order.get("restaurant_email"),
            "total": last_order.get("total"),
        }

    active = next((item for item in items if item.get("status") == "active"), None)
    subscription_status = (
        active.get("status")
        if active
        else (items[0].get("status") if items else None)
    )

    return {
        "today_meal": today_meal,
        "upcoming_meal": upcoming_meal,
        "last_generated_order": last_generated_order,
        "subscription_status": subscription_status,
    }


@router.get("/")
async def admin_list_subscriptions(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    q: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
    customer_email: Annotated[str | None, Query()] = None,
):
    items = await list_subscriptions_admin(
        q=q,
        status=status,
        restaurant_email=restaurant_email,
        customer_email=customer_email,
    )
    return {"items": items}


@router.get("/restaurant/{email}")
async def restaurant_subscriptions(
    email: str,
    current_user: Annotated[
        dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))
    ],
):
    assert_same_identity(current_user, email=email)
    items = await get_subscriptions_by_restaurant(email)
    return {"items": items}


@router.get("/{subscription_id}")
async def subscription_details(
    subscription_id: str,
    current_user: Annotated[
        dict,
        Depends(require_roles(CUSTOMER, RESTAURANT_OWNER, ADMIN)),
    ],
):
    subscription = await get_subscription_by_id(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    _assert_subscription_access(subscription, current_user)
    return subscription


@router.put("/{subscription_id}/pause")
async def pause_subscription(
    subscription_id: str,
    body: SubscriptionPauseRequest,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    subscription = await get_subscription_by_id(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    _assert_subscription_access(subscription, current_user)
    _ensure_mutable(subscription)

    start = date.fromisoformat(subscription["start_date"])
    end = date.fromisoformat(subscription["end_date"])
    if body.pause_from < start or body.pause_to > end:
        raise HTTPException(
            status_code=400,
            detail="Pause dates must fall within the subscription period",
        )

    updated = await update_subscription(
        subscription_id,
        {
            "status": "paused",
            "pause_from": body.pause_from,
            "pause_to": body.pause_to,
        },
    )
    if not updated:
        raise HTTPException(status_code=400, detail="Unable to pause subscription")

    return {
        "message": "Subscription paused",
        "subscription": await get_subscription_by_id(subscription_id),
    }


@router.put("/{subscription_id}/resume")
async def resume_subscription(
    subscription_id: str,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    subscription = await get_subscription_by_id(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    _assert_subscription_access(subscription, current_user)
    _ensure_mutable(subscription)

    if subscription.get("status") != "paused":
        raise HTTPException(status_code=400, detail="Subscription is not paused")

    today = date.today()
    end = date.fromisoformat(subscription["end_date"])
    next_status = "active" if end >= today else "expired"

    updated = await update_subscription(
        subscription_id,
        {
            "status": next_status,
            "pause_from": None,
            "pause_to": None,
        },
    )
    if not updated:
        raise HTTPException(status_code=400, detail="Unable to resume subscription")

    return {
        "message": "Subscription resumed",
        "subscription": await get_subscription_by_id(subscription_id),
    }


@router.put("/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    subscription = await get_subscription_by_id(subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    _assert_subscription_access(subscription, current_user)

    if subscription.get("status") == "cancelled":
        return {
            "message": "Subscription already cancelled",
            "subscription": subscription,
        }

    updated = await update_subscription(
        subscription_id,
        {
            "status": "cancelled",
            "pause_from": None,
            "pause_to": None,
            "auto_renew": False,
        },
    )
    if not updated:
        raise HTTPException(status_code=400, detail="Unable to cancel subscription")

    return {
        "message": "Subscription cancelled",
        "subscription": await get_subscription_by_id(subscription_id),
    }
