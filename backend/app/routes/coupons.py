from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.auth.auth import require_roles
from app.auth.roles import ADMIN, CUSTOMER
from app.core.logging import get_logger
from app.core.rate_limiter import limiter
from app.db.database import database

logger = get_logger(__name__)

router = APIRouter(tags=["Coupons"])


class CreateCouponRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=30)
    discount_type: Literal["flat", "percent"] = "flat"
    discount_value: float = Field(..., gt=0)
    min_order_value: float = Field(0.0, ge=0)
    max_discount: float | None = Field(None, ge=0)
    is_active: bool = True
    usage_limit: int = Field(500, ge=1)
    expires_at: datetime | str | None = None


class ValidateCouponRequest(BaseModel):
    code: str
    subtotal: float = Field(..., ge=0)


def _serialize_coupon(c: dict) -> dict:
    item = dict(c)
    item["id"] = str(item["_id"])
    item["_id"] = str(item["_id"])
    if isinstance(item.get("expires_at"), datetime):
        item["expires_at"] = item["expires_at"].isoformat()
    if isinstance(item.get("created_at"), datetime):
        item["created_at"] = item["created_at"].isoformat()
    return item


# -----------------------------------------------------------------------------
# Admin Endpoints
# -----------------------------------------------------------------------------

@router.post("/admin/coupons")
@router.post("/coupons/admin")
async def create_coupon(
    payload: CreateCouponRequest,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """Create a new promotional discount coupon."""
    normalized_code = payload.code.strip().upper()
    existing = await database["coupons"].find_one({"code": normalized_code})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coupon code '{normalized_code}' already exists.",
        )

    expires = payload.expires_at
    if isinstance(expires, str):
        try:
            expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
        except Exception:
            expires = None

    doc = {
        "code": normalized_code,
        "discount_type": payload.discount_type,
        "discount_value": float(payload.discount_value),
        "min_order_value": float(payload.min_order_value),
        "max_discount": float(payload.max_discount) if payload.max_discount is not None else None,
        "is_active": payload.is_active,
        "usage_limit": int(payload.usage_limit),
        "used_count": 0,
        "expires_at": expires,
        "created_at": datetime.now(UTC),
        "created_by": current_user.get("sub") or current_user.get("email"),
    }

    res = await database["coupons"].insert_one(doc)
    doc["_id"] = res.inserted_id
    logger.info(f"Created coupon '{normalized_code}' with id {res.inserted_id}")
    return {
        "success": True,
        "message": f"Coupon '{normalized_code}' created successfully",
        "coupon": _serialize_coupon(doc),
    }


@router.get("/admin/coupons")
@router.get("/coupons/admin")
async def list_admin_coupons(
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
    active_only: bool = Query(False),
):
    """List all coupons for admin dashboard management."""
    query = {"is_active": True} if active_only else {}
    cursor = database["coupons"].find(query).sort("created_at", -1)
    coupons = []
    async for doc in cursor:
        coupons.append(_serialize_coupon(doc))
    return {
        "success": True,
        "count": len(coupons),
        "coupons": coupons,
    }


@router.delete("/admin/coupons/{coupon_id}")
@router.delete("/coupons/admin/{coupon_id}")
async def delete_or_toggle_coupon(
    coupon_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
    hard_delete: bool = Query(False),
):
    """Delete a coupon or toggle it inactive."""
    query = {}
    if ObjectId.is_valid(coupon_id):
        query = {"$or": [{"_id": ObjectId(coupon_id)}, {"code": coupon_id.upper()}]}
    else:
        query = {"code": coupon_id.upper()}

    coupon = await database["coupons"].find_one(query)
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found",
        )

    if hard_delete:
        await database["coupons"].delete_one({"_id": coupon["_id"]})
        message = f"Coupon '{coupon.get('code')}' permanently removed."
    else:
        new_active = not coupon.get("is_active", True)
        await database["coupons"].update_one(
            {"_id": coupon["_id"]},
            {"$set": {"is_active": new_active}},
        )
        status_str = "activated" if new_active else "deactivated"
        message = f"Coupon '{coupon.get('code')}' {status_str}."

    return {
        "success": True,
        "message": message,
    }


# -----------------------------------------------------------------------------
# Public Student / Checkout Validation
# -----------------------------------------------------------------------------

@router.post("/coupons/apply")
@router.post("/api/coupons/apply")
@router.post("/api/coupons/validate")
@router.post("/coupons/validate")
@limiter.limit("20/minute")
async def validate_coupon(request: Request, payload: ValidateCouponRequest):
    """Validate coupon code and return discount and final order total."""
    code = (payload.code or "").strip().upper()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a coupon code.",
        )

    coupon = await database["coupons"].find_one({"code": code})
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid coupon code '{code}'.",
        )

    if not coupon.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coupon '{code}' is currently inactive.",
        )

    usage_limit = coupon.get("usage_limit", 500)
    used_count = coupon.get("used_count", 0)
    if used_count >= usage_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coupon '{code}' has reached its maximum usage limit.",
        )

    expires_at = coupon.get("expires_at")
    if expires_at:
        now = datetime.now(UTC)
        if isinstance(expires_at, datetime):
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=UTC)
            if expires_at < now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Coupon '{code}' expired on {expires_at.strftime('%Y-%m-%d')}.",
                )

    subtotal = float(payload.subtotal)
    min_order = float(coupon.get("min_order_value", 0.0))
    if subtotal < min_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order amount of ₹{min_order:.2f} required for coupon '{code}'.",
        )

    discount_type = coupon.get("discount_type", "flat")
    discount_val = float(coupon.get("discount_value", 0.0))
    max_discount = coupon.get("max_discount")
    if max_discount is not None:
        max_discount = float(max_discount)

    if discount_type == "percent":
        raw_discount = (subtotal * discount_val) / 100.0
        if max_discount is not None:
            discount_amount = min(raw_discount, max_discount)
        else:
            discount_amount = raw_discount
    else:
        discount_amount = discount_val

    # Never let discount exceed subtotal
    discount_amount = min(subtotal, round(discount_amount, 2))
    final_total = max(0.0, round(subtotal - discount_amount, 2))

    return {
        "valid": True,
        "code": code,
        "discount_type": discount_type,
        "discount_value": discount_val,
        "discount_amount": discount_amount,
        "final_total": final_total,
        "message": f"Coupon '{code}' applied! You saved ₹{discount_amount:.2f}",
    }
