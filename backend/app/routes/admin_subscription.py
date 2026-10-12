from typing import Annotated, Optional
from datetime import datetime, date, UTC
from bson import ObjectId
from bson.errors import InvalidId

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Body

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
from app.core.audit import log_admin_action
from app.core.logging import get_logger
from app.db.database import database
from app.models.subscription import _serialize
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


def get_database():
    return database


def _get_coll(db, coll_name: str):
    if hasattr(db, "__getitem__"):
        try:
            return db[coll_name]
        except (KeyError, TypeError):
            pass
    if hasattr(db, coll_name):
        return getattr(db, coll_name)
    return getattr(database, coll_name, database[coll_name])


def _sub_filter(sub_id: str) -> dict:
    conditions = [{"subscription_id": sub_id}]
    try:
        conditions.append({"_id": ObjectId(sub_id)})
    except Exception:
        pass
    conditions.append({"_id": sub_id})
    return {"$or": conditions}


def serialize_sub(doc: dict | None) -> dict | None:
    if not doc:
        return None
    sub = _serialize(doc) or dict(doc)
    sub_id = str(doc.get("_id") or sub.get("subscription_id") or "")
    if "_id" in sub:
        sub.pop("_id")
    sub["id"] = sub_id
    sub["subscription_id"] = sub_id
    if "price" in sub and sub["price"] is not None:
        try:
            sub["price"] = float(sub["price"])
        except (ValueError, TypeError):
            sub["price"] = 0.0
    return sub


@router.get("")
@router.get("/")
async def get_admin_subscriptions(
    search: Optional[str] = None,
    q: Optional[str] = None,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))] = None,
    db = Depends(get_database),
):
    coll = _get_coll(db, "subscriptions")
    query = {"is_deleted": {"$ne": True}}

    if status and status.lower() != "all":
        query["status"] = status.lower()
    if payment_status and payment_status.lower() != "all":
        query["payment_status"] = payment_status.lower()

    search_term = search or q
    if search_term:
        query["$or"] = [
            {"customer_email": {"$regex": search_term, "$options": "i"}},
            {"customer_name": {"$regex": search_term, "$options": "i"}},
            {"restaurant_name": {"$regex": search_term, "$options": "i"}},
            {"restaurant_email": {"$regex": search_term, "$options": "i"}},
            {"plan_name": {"$regex": search_term, "$options": "i"}},
            {"subscription_id": {"$regex": search_term, "$options": "i"}},
        ]

    cursor = coll.find(query).sort("created_at", -1)
    subs = await cursor.to_list(1000)

    # Compute authoritative stats directly from all subscriptions
    all_cursor = coll.find({"is_deleted": {"$ne": True}})
    all_subs = await all_cursor.to_list(2000)

    total_revenue = sum(
        float(s.get("price", 0)) for s in all_subs 
        if str(s.get("payment_status", "")).lower() == "paid"
    )
    paid_count = sum(1 for s in all_subs if str(s.get("payment_status", "")).lower() == "paid")
    pending_count = sum(1 for s in all_subs if str(s.get("payment_status", "")).lower() == "pending")
    active_count = sum(1 for s in all_subs if str(s.get("status", "")).lower() == "active")

    serialized_subs = [serialize_sub(s) for s in subs]
    return {
        "subscriptions": serialized_subs,
        "items": serialized_subs,
        "stats": {
            "total_revenue": round(total_revenue, 2),
            "paid_count": paid_count,
            "pending_count": pending_count,
            "active_count": active_count,
            "total_count": len(all_subs),
        },
    }


@router.patch("/{sub_id}/payment-status")
async def update_subscription_payment_status(
    sub_id: str,
    payload: Optional[dict] = Body(default=None),
    current_user: Annotated[dict, Depends(require_roles(ADMIN))] = None,
    db = Depends(get_database),
):
    coll = _get_coll(db, "subscriptions")
    sub = await coll.find_one(_sub_filter(sub_id))
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    new_payment_status = None
    if payload and "payment_status" in payload and payload["payment_status"]:
        new_payment_status = str(payload["payment_status"]).strip().lower()
    else:
        current_status = str(sub.get("payment_status", "pending")).lower()
        new_payment_status = "pending" if current_status == "paid" else "paid"

    update_fields = {
        "payment_status": new_payment_status,
        "updated_at": datetime.now(UTC),
    }
    # If set to paid, automatically activate subscription:
    if new_payment_status == "paid":
        update_fields["status"] = "active"

    await coll.update_one(
        {"_id": sub["_id"]},
        {"$set": update_fields},
    )

    refreshed = await coll.find_one({"_id": sub["_id"]})
    return {
        "success": True,
        "message": f"Payment status updated to {new_payment_status}",
        "subscription": serialize_sub(refreshed),
    }


@router.patch("/{sub_id}/status")
async def update_subscription_status(
    sub_id: str,
    payload: dict = Body(...),
    current_user: Annotated[dict, Depends(require_roles(ADMIN))] = None,
    db = Depends(get_database),
):
    coll = _get_coll(db, "subscriptions")
    sub = await coll.find_one(_sub_filter(sub_id))
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    new_status = str(payload.get("status", "")).strip().lower()
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")

    await coll.update_one(
        {"_id": sub["_id"]},
        {"$set": {"status": new_status, "updated_at": datetime.now(UTC)}},
    )

    refreshed = await coll.find_one({"_id": sub["_id"]})
    return {
        "success": True,
        "message": f"Subscription status updated to {new_status}",
        "subscription": serialize_sub(refreshed),
    }


@router.delete("/{sub_id}")
async def delete_admin_subscription(
    sub_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))] = None,
    db = Depends(get_database),
):
    coll = _get_coll(db, "subscriptions")
    sub = await coll.find_one(_sub_filter(sub_id))
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Soft-delete or archive record
    await coll.update_one(
        {"_id": sub["_id"]},
        {
            "$set": {
                "is_deleted": True,
                "status": "cancelled",
                "deleted_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
        },
    )
    return {
        "success": True,
        "message": "Subscription deleted successfully",
    }


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
