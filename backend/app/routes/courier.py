"""Courier route module and financial serialization hardening.

Ensures every returned order and courier settlement / reconciliation object provides non-null values for:
- items_subtotal: float (default 0.0)
- gst: float (default 0.0)
- delivery_fee: float (default 0.0)
- platform_fee: float (default 0.0)
- commission_amount: float (default 0.0)
- net_payout: float (default 0.0)
- total_amount: float (default 0.0)
"""

from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, DELIVERY_PARTNER
from app.models.delivery_partner import (
    get_delivery_partner_by_phone,
    get_delivery_partner_by_email,
    get_delivery_partner_by_id,
    serialize_partner_profile,
)
from app.models.order import (
    get_delivery_orders,
    normalize_order_financials,
)


def normalize_courier_financials(obj: dict) -> dict:
    """Guarantees non-null float defaults for all 7 standard financial fields."""
    if not isinstance(obj, dict):
        return obj

    # If this is an order object
    if "items" in obj or "status" in obj and ("restaurant_email" in obj or "delivery_partner" in obj):
        return normalize_order_financials(obj)

    # Courier settlement / summary object
    wages = float(obj.get("wages_earned") or obj.get("total_payout_earned") or 0.0)
    cod = float(obj.get("cod_collected") or obj.get("cash_in_hand") or 0.0)
    net_due = float(
        obj.get("net_cash_due_to_admin")
        if obj.get("net_cash_due_to_admin") is not None
        else (obj.get("net_cash_due") if obj.get("net_cash_due") is not None else max(0.0, cod - wages))
    )

    subtotal = float(obj.get("items_subtotal") or 0.0)
    gst = float(obj.get("gst") or 0.0)
    delivery_fee = float(
        obj.get("delivery_fee") if obj.get("delivery_fee") is not None else wages
    )
    platform_fee = float(obj.get("platform_fee") or 0.0)
    commission = float(obj.get("commission_amount") or 0.0)
    net_payout = float(
        obj.get("net_payout") if obj.get("net_payout") is not None else wages
    )
    total_val = float(
        obj.get("total_amount") if obj.get("total_amount") is not None else cod
    )

    obj["items_subtotal"] = subtotal
    obj["gst"] = gst
    obj["delivery_fee"] = delivery_fee
    obj["platform_fee"] = platform_fee
    obj["commission_amount"] = commission
    obj["net_payout"] = net_payout
    obj["total_amount"] = total_val
    obj["wages_earned"] = wages
    obj["cod_collected"] = cod
    obj["net_cash_due"] = net_due

    return obj


from app.services.courier_service import (
    calculate_courier_order_wage,
    apply_courier_batch_wages,
)

router = APIRouter(
    prefix="/courier",
    tags=["Courier"],
)


@router.get("/orders/active")
@router.get("/orders/assigned")
async def get_courier_active_orders(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    phone: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[dict[str, Any]]:
    rider_phone = phone or current_user.get("phone")
    if not rider_phone:
        raise HTTPException(
            status_code=400,
            detail="Phone number is required to fetch active orders",
        )
    assert_same_identity(current_user, phone=rider_phone)

    raw_orders = await get_delivery_orders(
        phone=rider_phone,
        status=status,
        limit=limit,
    )
    if isinstance(raw_orders, dict) and "items" in raw_orders:
        orders = [normalize_order_financials(o) for o in raw_orders["items"]]
    else:
        orders = [normalize_order_financials(o) for o in (raw_orders or [])]

    # Filter to active/assigned runs if no specific status requested
    if not status:
        active_statuses = {"assigned", "picked up", "picked_up", "out for delivery", "out_for_delivery"}
        orders = [
            o for o in orders
            if str(o.get("status", "")).strip().lower() in active_statuses
        ]

    # Order the batch by pickup / sequence (accepted_at ascending)
    orders.sort(
        key=lambda o: str(
            (o.get("delivery_partner") or {}).get("accepted_at")
            or o.get("accepted_at")
            or o.get("created_at")
            or ""
        )
    )

    # 1st order: ₹20 base, 2nd+ orders: ₹14 batch_addon
    return apply_courier_batch_wages(orders)


@router.get("/orders/{phone}")
async def get_courier_assigned_orders(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    status: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query()] = 50,
) -> list[dict[str, Any]]:
    assert_same_identity(current_user, phone=phone)
    raw_orders = await get_delivery_orders(phone=phone, status=status, limit=limit)
    if isinstance(raw_orders, dict) and "items" in raw_orders:
        orders = [normalize_order_financials(o) for o in raw_orders["items"]]
    else:
        orders = [normalize_order_financials(o) for o in (raw_orders or [])]

    # Sequence active runs with tiered batch wages
    active_orders = [
        o for o in orders
        if str(o.get("status", "")).strip().lower() in {"assigned", "picked up", "picked_up", "out for delivery", "out_for_delivery"}
    ]
    if active_orders:
        apply_courier_batch_wages(active_orders)

    return orders


@router.get("/reconciliation/{phone}")
async def get_courier_reconciliation(
    phone: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
) -> dict[str, Any]:
    assert_same_identity(current_user, phone=phone)
    partner = await get_delivery_partner_by_phone(phone)
    if not partner:
        raise HTTPException(status_code=404, detail="Courier profile not found")

    cih = float(partner.get("cash_in_hand") or 0.0)
    payout = float(partner.get("total_payout_earned") or 0.0)
    due = float(
        partner.get("net_cash_due")
        if partner.get("net_cash_due") is not None
        else max(0.0, cih - payout)
    )

    data = {
        "id": str(partner.get("_id", "")),
        "name": partner.get("name") or "Courier",
        "phone": phone,
        "cash_in_hand": cih,
        "total_payout_earned": payout,
        "net_cash_due": due,
        "is_locked": bool(partner.get("is_locked", False)),
    }
    return normalize_courier_financials(data)
