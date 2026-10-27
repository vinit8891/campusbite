"""Orders router module with automated batch delivery clustering endpoints.

Re-exports existing order routes and financial normalization helpers:
- items_subtotal: float
- gst: float
- delivery_fee: float
- platform_fee: float
- commission_amount: float
- net_payout: float
- total_amount: float

Adds automated batch delivery clustering and wave dispatch endpoints:
- GET /batches/active: Retrieves active batches clustered by hostel block & canteen
- GET /batch-window: Retrieves upcoming batch window slot and remaining minutes
- POST /batches/cluster: Algorithmically clusters a batch of candidate orders
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Query

from app.models.order import (
    calculate_order_financials,
    normalize_order_financials,
)
from app.routes.order import *  # noqa: F401, F403
from app.routes.order import router as base_order_router
from app.services.batching import (
    cluster_orders_into_batches,
    get_active_batch_clusters,
    get_next_batch_window,
)

# Re-use base order router and attach batch clustering endpoints
router = base_order_router

# Dedicated batch router that can also be mounted under /api/orders or /orders
batch_router = APIRouter(prefix="/orders", tags=["Order Batching"])


@router.get("/batches/active", summary="Get active delivery batches")
async def get_active_batches() -> dict[str, Any]:
    """Retrieves all active multi-order delivery batches clustered by campus hostel."""
    clusters = await get_active_batch_clusters()
    return {
        "success": True,
        "count": len(clusters),
        "batches": clusters,
    }


@router.get("/batch-window", summary="Get next batch delivery window")
def get_batch_window() -> dict[str, Any]:
    """Retrieves current or upcoming campus batch delivery wave slot with countdown."""
    window = get_next_batch_window()
    return {
        "success": True,
        "batch_window": window,
    }


@router.post("/batches/cluster", summary="Cluster orders into batches")
def cluster_candidate_orders(
    orders: list[dict[str, Any]] = Body(..., embed=True)
) -> dict[str, Any]:
    """Algorithmically clusters orders into delivery runner batches."""
    clusters = cluster_orders_into_batches(orders)
    return {
        "success": True,
        "batch_count": len(clusters),
        "batches": clusters,
    }


__all__ = [
    "router",
    "batch_router",
    "calculate_order_financials",
    "normalize_order_financials",
    "cluster_orders_into_batches",
    "get_active_batch_clusters",
    "get_next_batch_window",
]
