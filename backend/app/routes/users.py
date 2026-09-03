from typing import Annotated
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.auth import require_roles
from app.auth.roles import CUSTOMER
from app.auth.security import hash_password, verify_password
from app.core.logging import get_logger
from app.db.database import database

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

logger = get_logger(__name__)

ACTIVE_ORDER_STATUSES = [
    "Pending",
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Assigned",
    "Picked Up",
    "Out for Delivery",
]


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


class UpdateProfilePayload(BaseModel):
    name: str | None = None
    phone: str | None = None
    default_hostel_block: str | None = None
    default_room: str | None = None
    default_instructions: str | None = None
    notification_preferences: dict | None = None


def _user_id_filter(user_id: str, email: str | None = None) -> dict:
    try:
        oid = ObjectId(user_id)
        if email:
            return {"$or": [{"_id": oid}, {"email": email.strip().lower()}]}
        return {"_id": oid}
    except Exception:
        if email:
            return {"$or": [{"_id": user_id}, {"email": email.strip().lower()}]}
        return {"_id": user_id}


@router.get("/me")
async def get_my_profile(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    """Fetch current customer profile, order statistics, and saved address."""
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    email = current_user.get("email")
    phone = current_user.get("phone")

    query = _user_id_filter(user_id, email)
    user_doc = await database["users"].find_one(query)
    if not user_doc and email:
        user_doc = await database["users"].find_one({"email": email.strip().lower()})

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    # Fetch dynamic order stats
    order_query = []
    if email:
        order_query.append({"customer_email": email})
    if phone:
        order_query.append({"phone": phone})
    if user_doc.get("phone"):
        order_query.append({"phone": user_doc.get("phone")})

    order_count = 0
    if order_query:
        order_count = await database["orders"].count_documents({"$or": order_query})

    return {
        "id": str(user_doc.get("_id")),
        "name": user_doc.get("full_name") or user_doc.get("name") or "",
        "email": user_doc.get("email") or "",
        "phone": user_doc.get("phone") or "",
        "default_hostel_block": user_doc.get("default_hostel_block") or "Hostel Block A",
        "default_room": user_doc.get("default_room") or "",
        "default_instructions": user_doc.get("default_instructions") or "",
        "notification_preferences": user_doc.get("notification_preferences") or {
            "whatsapp_updates": True,
            "sms_alerts": True,
            "promo_offers": False,
        },
        "order_count": order_count,
        "created_at": user_doc.get("created_at"),
    }


@router.put("/me")
async def update_my_profile(
    payload: UpdateProfilePayload,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    """Update customer profile information and default delivery preferences."""
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    email = current_user.get("email")

    query = _user_id_filter(user_id, email)
    update_fields = {}

    if payload.name is not None:
        update_fields["full_name"] = payload.name.strip()
        update_fields["name"] = payload.name.strip()
    if payload.phone is not None:
        update_fields["phone"] = payload.phone.strip()
    if payload.default_hostel_block is not None:
        update_fields["default_hostel_block"] = payload.default_hostel_block.strip()
    if payload.default_room is not None:
        update_fields["default_room"] = payload.default_room.strip()
    if payload.default_instructions is not None:
        update_fields["default_instructions"] = payload.default_instructions.strip()
    if payload.notification_preferences is not None:
        update_fields["notification_preferences"] = payload.notification_preferences

    if not update_fields:
        return {"success": True, "message": "No changes to update"}

    result = await database["users"].update_one(query, {"$set": update_fields})
    if result.matched_count == 0 and email:
        result = await database["users"].update_one(
            {"email": email.strip().lower()}, {"$set": update_fields}
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {"success": True, "message": "Profile updated successfully"}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordPayload,
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    """Change customer account password."""
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    email = current_user.get("email")

    query = _user_id_filter(user_id, email)
    user_doc = await database["users"].find_one(query)
    if not user_doc and email:
        user_doc = await database["users"].find_one({"email": email.strip().lower()})

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not verify_password(payload.current_password, user_doc.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long",
        )

    new_hash = hash_password(payload.new_password)
    await database["users"].update_one(
        {"_id": user_doc["_id"]},
        {"$set": {"password": new_hash}},
    )

    return {"success": True, "message": "Password changed successfully"}


@router.delete("/me")
async def delete_my_account(
    current_user: Annotated[dict, Depends(require_roles(CUSTOMER))],
):
    """
    Self-service account deletion for authenticated customers.
    Rejects if active unfulfilled orders exist, then deletes the customer record.
    """
    user_id = str(current_user.get("sub") or current_user.get("id") or "")
    email = current_user.get("email")
    phone = current_user.get("phone")

    query = _user_id_filter(user_id, email)
    user_doc = await database["users"].find_one(query)
    if not user_doc and email:
        user_doc = await database["users"].find_one({"email": email.strip().lower()})

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found",
        )

    # Active order validation
    order_clause = []
    user_phone = user_doc.get("phone") or phone
    user_email = user_doc.get("email") or email

    if user_phone:
        order_clause.append({"phone": user_phone})
    if user_email:
        order_clause.append({"customer_email": user_email})

    if order_clause:
        active_order = await database["orders"].find_one(
            {
                "$or": order_clause,
                "status": {"$in": ACTIVE_ORDER_STATUSES},
            }
        )
        if active_order:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete account while you have active unfulfilled orders.",
            )

    # Delete customer from MongoDB
    await database["users"].delete_one({"_id": user_doc["_id"]})

    logger.info("users.delete_my_account customer=%s deleted successfully", user_email)
    return {"success": True, "message": "Account successfully deleted"}
