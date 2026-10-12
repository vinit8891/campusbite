"""Settlements route module and financial serialization hardening.

Ensures every returned settlement object provides non-null values for:
- items_subtotal: float (default 0.0)
- gst: float (default 0.0)
- delivery_fee: float (default 0.0)
- platform_fee: float (default 0.0)
- commission_amount: float (default 0.0)
- net_payout: float (default 0.0)
- total_amount: float (default 0.0)
"""

from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query

from app.auth.auth import require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.services.settlement_service import (
    calculate_canteen_daily_settlement,
    get_daily_canteen_settlement_summary,
)


def calculate_courier_settlement_wages(completed_orders: list[dict]) -> float:
    """
    Calculate wages accurately: ₹20 for primary drops + ₹14 for bundled drops
    """
    return sum(
        float(o.get("courier_earning", 20.0)) for o in (completed_orders or [])
    )


def normalize_settlement_financials(settlement: dict) -> dict:
    """Guarantees non-null float defaults for all 7 standard financial fields."""
    if not isinstance(settlement, dict):
        return settlement

    subtotal = float(
        settlement.get("items_subtotal")
        if settlement.get("items_subtotal") is not None
        else (settlement.get("gross_food_sales") or 0.0)
    )
    gst = float(
        settlement.get("gst")
        if settlement.get("gst") is not None
        else (settlement.get("gst_collected") or settlement.get("gst_amount") or 0.0)
    )
    delivery_fee = float(settlement.get("delivery_fee") or 0.0)
    platform_fee = float(settlement.get("platform_fee") or 0.0)
    commission = float(
        settlement.get("commission_amount")
        if settlement.get("commission_amount") is not None
        else (
            settlement.get("platform_commission")
            or settlement.get("commission_deducted")
            or 0.0
        )
    )
    net_payout = float(
        settlement.get("net_payout")
        if settlement.get("net_payout") is not None
        else (
            settlement.get("net_canteen_payable")
            or settlement.get("net_payable_subtotal")
            or 0.0
        )
    )
    total_val = float(
        settlement.get("total_amount")
        if settlement.get("total_amount") is not None
        else round(subtotal + gst, 2)
    )

    settlement["items_subtotal"] = subtotal
    settlement["gst"] = gst
    settlement["delivery_fee"] = delivery_fee
    settlement["platform_fee"] = platform_fee
    settlement["commission_amount"] = commission
    settlement["net_payout"] = net_payout
    settlement["total_amount"] = total_val

    return settlement


router = APIRouter(
    prefix="/settlements",
    tags=["Settlements"],
)


@router.get("/canteen/{restaurant_email}")
async def get_canteen_settlement(
    restaurant_email: str,
    _: Annotated[dict, Depends(require_roles(RESTAURANT_OWNER, ADMIN))],
    date: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    settlement = await calculate_canteen_daily_settlement(
        restaurant_email=restaurant_email,
        target_date=date,
    )
    return normalize_settlement_financials(settlement)


@router.get("/daily-summary")
async def get_settlement_daily_summary(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    date: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    summary = await get_daily_canteen_settlement_summary(target_date=date)
    settlements = summary.get("settlements") or []
    summary["settlements"] = [
        normalize_settlement_financials(s) for s in settlements
    ]
    return summary


@router.post("/mark-paid")
@router.post("/canteens/{canteen_id}/mark-paid")
async def mark_settlement_paid_route(
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
    canteen_id: str | None = None,
    payload: dict | None = None,
):
    from app.routers.admin import mark_canteen_settlement_paid
    payload = payload or {}
    target_id = (
        canteen_id
        or payload.get("restaurant_id")
        or payload.get("canteen_id")
        or payload.get("restaurant_email")
        or payload.get("id")
        or "canteen"
    )
    return await mark_canteen_settlement_paid(
        canteen_id=target_id,
        current_user=current_user,
        payload=payload,
    )
