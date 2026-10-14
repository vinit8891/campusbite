"""Canteen Payouts & Daily Ledger API Router.

Implements:
- GET /api/v1/payouts/canteen/{canteen_id}/daily-ledgers
- GET /api/v1/payouts/canteen/{canteen_id}/upcoming-disbursal
- POST /api/v1/admin/payouts/settle-batch
- GET /api/v1/admin/payouts/current-batch
- GET /api/v1/admin/payouts/daily-platform-ledger
With backward-compatible aliases under /payouts and /admin/payouts.
"""

from __future__ import annotations

from typing import Annotated, Any, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.auth.auth import get_current_user, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.services.canteen_ledger_service import (
    get_canteen_daily_ledgers,
    get_canteen_upcoming_disbursal,
    settle_payout_batch,
    get_admin_current_disbursal_batches,
    get_admin_daily_platform_ledger,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(
    tags=["Canteen Payouts"],
)


class SettleBatchPayload(BaseModel):
    canteen_id: Optional[str] = None
    canteen_ids: Optional[list[str]] = None
    scheduled_payout_date: Optional[str] = None
    batch_date: Optional[str] = None
    ledger_ids: Optional[list[str]] = None
    utr_number: str
    notes: Optional[str] = None


# -------------------------------------------------------------
# 1. Canteen Daily Ledgers Endpoint
# -------------------------------------------------------------
@router.get("/api/v1/payouts/canteen/{canteen_id}/daily-ledgers")
@router.get("/payouts/canteen/{canteen_id}/daily-ledgers")
async def get_canteen_daily_ledgers_endpoint(
    canteen_id: str,
    start_date: Annotated[Optional[str], Query()] = None,
    end_date: Annotated[Optional[str], Query()] = None,
    date: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 60,
):
    """
    Returns itemized daily statements with date filter.
    Includes 18% platform take rate, gross food sales, completed orders,
    and individual itemized orders.
    """
    try:
        data = await get_canteen_daily_ledgers(
            canteen_id=canteen_id,
            start_date=start_date,
            end_date=end_date,
            target_date=date,
            limit=limit,
        )
        return data
    except Exception as e:
        logger.error("Failed to fetch daily ledgers for %s: %s", canteen_id, e)
        return {
            "canteen_id": canteen_id,
            "canteen_name": canteen_id,
            "ledgers": [],
            "total_ledgers": 0,
            "summary": {
                "total_gross_sales": 0.0,
                "total_commission_amount": 0.0,
                "total_net_payout": 0.0,
                "total_completed_orders": 0,
            },
            "error": str(e),
        }


# -------------------------------------------------------------
# 2. Upcoming Disbursal Endpoint
# -------------------------------------------------------------
@router.get("/api/v1/payouts/canteen/{canteen_id}/upcoming-disbursal")
@router.get("/payouts/canteen/{canteen_id}/upcoming-disbursal")
async def get_canteen_upcoming_disbursal_endpoint(
    canteen_id: str,
):
    """
    Returns pending accrued balance, next disbursal date (Tue or Fri),
    and linked daily ledger IDs for bank clearance.
    """
    try:
        data = await get_canteen_upcoming_disbursal(canteen_id=canteen_id)
        return data
    except Exception as e:
        logger.error("Failed to fetch upcoming disbursal for %s: %s", canteen_id, e)
        return {
            "canteen_id": canteen_id,
            "canteen_name": canteen_id,
            "next_disbursal_date": "",
            "next_disbursal_day": "Tuesday",
            "formatted_payout_date": "",
            "accrued_net_balance": 0.0,
            "accrued_net_earnings": 0.0,
            "total_gross_sales": 0.0,
            "commission_rate": 0.18,
            "total_commission_amount": 0.0,
            "status_badge": "Queued for Bank Disbursal (T+2 Clearance)",
            "status": "QUEUED",
            "pending_ledger_ids": [],
            "daily_ledgers_count": 0,
            "error": str(e),
        }


# -------------------------------------------------------------
# 3. Admin Settle Batch Endpoint
# -------------------------------------------------------------
@router.post("/api/v1/admin/payouts/settle-batch")
@router.post("/admin/payouts/settle-batch")
async def admin_settle_batch_endpoint(
    payload: SettleBatchPayload,
):
    """
    Allows admin to mark a batch or day as SETTLED by providing a UTR/UPI reference ID.
    Updates daily_canteen_ledgers and syncs with canteen_settlements.
    """
    if not payload.utr_number or not payload.utr_number.strip():
        raise HTTPException(status_code=400, detail="UTR or transaction reference number is required")

    try:
        target_date = payload.scheduled_payout_date or payload.batch_date
        target_canteen = payload.canteen_id or (payload.canteen_ids[0] if payload.canteen_ids else None)
        res = await settle_payout_batch(
            canteen_id=target_canteen,
            scheduled_payout_date=target_date,
            ledger_ids=payload.ledger_ids,
            utr_number=payload.utr_number,
            notes=payload.notes or "",
        )
        return res
    except Exception as e:
        logger.error("Failed to settle batch: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to settle batch: {str(e)}")


# -------------------------------------------------------------
# 4. Admin Current Disbursal Batch (Tue/Fri) Endpoint
# -------------------------------------------------------------
@router.get("/api/v1/admin/payouts/current-batch")
@router.get("/admin/payouts/current-batch")
async def admin_get_current_batch_endpoint():
    """
    Returns total sum owed to each canteen for the upcoming Tuesday/Friday batch,
    along with ledger IDs ready for settlement.
    """
    try:
        return await get_admin_current_disbursal_batches()
    except Exception as e:
        logger.error("Failed to fetch admin current batches: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------
# 5. Admin Daily Platform Ledger Endpoint
# -------------------------------------------------------------
@router.get("/api/v1/admin/payouts/daily-platform-ledger")
@router.get("/admin/payouts/daily-platform-ledger")
async def admin_get_daily_platform_ledger_endpoint(
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
):
    """
    CampusBite's total 18% take-rate and platform fee earnings per calendar day.
    """
    try:
        return await get_admin_daily_platform_ledger(limit=limit)
    except Exception as e:
        logger.error("Failed to fetch admin daily platform ledger: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
