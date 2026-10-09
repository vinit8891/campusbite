"""Routes for Multi-Tier Partner Onboarding, KYC Document Uploads, and Admin Verification Decisions."""

from __future__ import annotations

from datetime import UTC, datetime
import os
import shutil
import uuid
from typing import Annotated, Any, Optional
from bson import ObjectId

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from starlette.staticfiles import StaticFiles

from app.auth.auth import require_roles
from app.auth.roles import ADMIN
from app.auth.security import hash_password
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email
from app.db.database import database
from app.schemas.partner_onboarding import (
    CourierOnboardingRequest,
    CourierType,
    RestaurantOnboardingRequest,
    VendorType,
    VerificationDecisionRequest,
    VerificationStatus,
)

logger = get_logger(__name__)

router = APIRouter(
    tags=["Partner Onboarding & Verification"],
)

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "kyc")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ==============================================================================
# 1. Restaurant / Vendor Multi-Tier Onboarding
# ==============================================================================

@router.post("/restaurant/onboard")
async def onboard_restaurant(
    payload: RestaurantOnboardingRequest,
):
    """
    Onboards a new canteen, home tiffin kitchen, or food stall partner.
    Stores KYC and banking details in PENDING_VERIFICATION state.
    """
    logger.info("partner_onboarding.restaurant request received vendor_type=%s", payload.vendor_type)

    email = sanitize_email(payload.email)
    phone = payload.phone.strip()

    # Check if restaurant or restaurant owner exists
    existing_owner = await database["restaurant_owners"].find_one(
        {"$or": [{"email": email}, {"phone": phone}]}
    )
    if existing_owner:
        raise HTTPException(
            status_code=400,
            detail="An account with this email or phone number is already registered.",
        )

    existing_restaurant = await database["restaurants"].find_one(
        {"$or": [{"email": email}, {"phone": phone}]}
    )
    if existing_restaurant:
        raise HTTPException(
            status_code=400,
            detail="A restaurant or food stall with this email or phone is already registered.",
        )

    hashed_pwd = hash_password(payload.password)
    now = datetime.now(UTC)

    restaurant_doc = {
        "name": payload.business_name,
        "business_name": payload.business_name,
        "owner_name": payload.owner_name,
        "email": email,
        "phone": phone,
        "password": hashed_pwd,
        "vendor_type": payload.vendor_type.value,
        "address": payload.address_or_stall_landmark,
        "address_or_stall_landmark": payload.address_or_stall_landmark,
        "is_inside_campus": payload.is_inside_campus,
        "compliance_doc_type": payload.compliance_doc_type.value,
        "compliance_doc_url": payload.compliance_doc_url,
        "kitchen_or_stall_photo_url": payload.kitchen_or_stall_photo_url,
        "bank_account_holder": payload.bank_account_holder,
        "bank_account_number": payload.bank_account_number,
        "bank_ifsc_code": payload.bank_ifsc_code,
        "settlement_upi_id": payload.settlement_upi_id,
        "verification_status": VerificationStatus.PENDING_VERIFICATION.value,
        "is_active": False,
        "is_open": False,
        "created_at": now,
        "updated_at": now,
    }

    res = await database["restaurants"].insert_one(restaurant_doc)
    restaurant_id = str(res.inserted_id)

    # Sync into restaurant_owners collection for dashboard auth
    owner_doc = {
        "restaurant_id": restaurant_id,
        "owner_name": payload.owner_name,
        "email": email,
        "phone": phone,
        "password": hashed_pwd,
        "restaurant_name": payload.business_name,
        "vendor_type": payload.vendor_type.value,
        "verification_status": VerificationStatus.PENDING_VERIFICATION.value,
        "created_at": now,
    }
    await database["restaurant_owners"].insert_one(owner_doc)

    logger.info("partner_onboarding.restaurant registered id=%s", restaurant_id)
    return {
        "success": True,
        "message": "Restaurant onboarding application submitted successfully. Verification pending approval.",
        "id": restaurant_id,
        "verification_status": VerificationStatus.PENDING_VERIFICATION.value,
    }


# ==============================================================================
# 2. Courier / Runner Multi-Tier Onboarding
# ==============================================================================

@router.post("/delivery/onboard")
async def onboard_courier(
    payload: CourierOnboardingRequest,
):
    """
    Onboards a new Student Runner or External Gig Courier partner.
    Stores identification and payout details in PENDING_VERIFICATION state.
    """
    logger.info("partner_onboarding.courier request received courier_type=%s", payload.courier_type)

    email = sanitize_email(payload.email)
    phone = payload.phone.strip()

    existing_courier = await database["delivery_partners"].find_one(
        {"$or": [{"email": email}, {"phone": phone}]}
    )
    if existing_courier:
        raise HTTPException(
            status_code=400,
            detail="A courier with this email or phone number is already registered.",
        )

    hashed_pwd = hash_password(payload.password)
    now = datetime.now(UTC)

    courier_doc = {
        "name": payload.full_name,
        "full_name": payload.full_name,
        "email": email,
        "phone": phone,
        "password": hashed_pwd,
        "courier_type": payload.courier_type.value,
        "transit_mode": payload.transit_mode.value,
        "vehicle_type": payload.transit_mode.value,
        "vehicle": payload.transit_mode.value,
        "vehicle_number": payload.vehicle_number or "",
        "id_proof_type": payload.id_proof_type.value,
        "id_proof_doc_url": payload.id_proof_doc_url,
        "student_details": payload.student_details.model_dump() if payload.student_details else None,
        "payout_upi_id": payload.payout_upi_id,
        "emergency_contact_phone": payload.emergency_contact_phone,
        "verification_status": VerificationStatus.PENDING_VERIFICATION.value,
        "is_active": False,
        "is_online": False,
        "online": False,
        "cash_in_hand": 0.0,
        "total_payout_earned": 0.0,
        "net_cash_due": 0.0,
        "created_at": now,
        "updated_at": now,
    }

    res = await database["delivery_partners"].insert_one(courier_doc)
    courier_id = str(res.inserted_id)

    logger.info("partner_onboarding.courier registered id=%s", courier_id)
    return {
        "success": True,
        "message": "Courier onboarding application submitted successfully. Verification pending approval.",
        "id": courier_id,
        "verification_status": VerificationStatus.PENDING_VERIFICATION.value,
    }


# ==============================================================================
# 3. Secure KYC & Compliance Document Upload
# ==============================================================================

@router.post("/api/upload/kyc-document")
async def upload_kyc_document(
    file: UploadFile = File(...),
):
    """
    Accepts image (PNG, JPG, WEBP) or PDF documents for partner KYC, FSSAI,
    Student ID, and Kitchen photos. Saves securely and returns accessible URL.
    """
    logger.info("partner_onboarding.upload_doc received filename=%s content_type=%s", file.filename, file.content_type)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file submitted.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload JPG, PNG, WEBP, or PDF documents.",
        )

    unique_id = uuid.uuid4().hex[:12]
    safe_basename = "".join(c for c in os.path.splitext(file.filename)[0] if c.isalnum() or c in ("-", "_"))[:30]
    generated_filename = f"kyc_{unique_id}_{safe_basename}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, generated_filename)

    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        logger.error("Failed to save KYC file error=%s", exc)
        raise HTTPException(status_code=500, detail="Failed to save uploaded document.") from exc

    file_url = f"/uploads/kyc/{generated_filename}"
    return {
        "success": True,
        "file_url": file_url,
        "filename": generated_filename,
    }


# ==============================================================================
# 4. Admin Verification Queue & Decision Endpoints
# ==============================================================================

@router.get("/admin/verifications/pending")
async def get_pending_verifications(
    _: Annotated[dict, Depends(require_roles(ADMIN))],
    partner_type: Annotated[str | None, Query()] = "all",
):
    """
    Returns pending partner applications across Canteens, Tiffin Dabbas, Stalls,
    Student Couriers, and External Couriers for Admin review.
    """
    pt = (partner_type or "all").lower().strip()
    results = []

    # Fetch pending restaurants / food vendors
    if pt in ("all", "canteens", "tiffins", "stalls", "restaurants", "vendor"):
        restaurant_query: dict[str, Any] = {
            "$or": [
                {"verification_status": {"$in": ["PENDING_VERIFICATION", "pending"]}},
                {"verification_status": {"$exists": False}},
            ]
        }
        if pt == "canteens":
            restaurant_query["vendor_type"] = VendorType.CAMPUS_CANTEEN.value
        elif pt == "tiffins":
            restaurant_query["vendor_type"] = VendorType.HOME_TIFFIN.value
        elif pt == "stalls":
            restaurant_query["vendor_type"] = VendorType.STREET_STALL.value

        async for doc in database["restaurants"].find(restaurant_query).sort("created_at", -1):
            results.append({
                "id": str(doc["_id"]),
                "partner_category": "RESTAURANT",
                "vendor_type": doc.get("vendor_type") or "CAMPUS_CANTEEN",
                "courier_type": None,
                "business_name": doc.get("business_name") or doc.get("name") or "Unnamed Kitchen",
                "applicant_name": doc.get("owner_name") or doc.get("name") or "Partner",
                "email": doc.get("email") or "",
                "phone": doc.get("phone") or "",
                "address": doc.get("address_or_stall_landmark") or doc.get("address") or "",
                "is_inside_campus": doc.get("is_inside_campus", True),
                "compliance_doc_type": doc.get("compliance_doc_type") or "COLLEGE_PERMIT",
                "compliance_doc_url": doc.get("compliance_doc_url") or "",
                "kitchen_or_stall_photo_url": doc.get("kitchen_or_stall_photo_url") or "",
                "id_proof_type": None,
                "id_proof_doc_url": None,
                "student_details": None,
                "transit_mode": None,
                "vehicle_number": None,
                "bank_details": {
                    "account_holder": doc.get("bank_account_holder") or "",
                    "account_number": doc.get("bank_account_number") or "",
                    "ifsc": doc.get("bank_ifsc_code") or "",
                },
                "upi_id": doc.get("settlement_upi_id") or "",
                "emergency_contact_phone": None,
                "verification_status": doc.get("verification_status") or "PENDING_VERIFICATION",
                "rejection_reason": doc.get("rejection_reason"),
                "created_at": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at") or ""),
            })

    # Fetch pending couriers / riders
    if pt in ("all", "students", "externals", "couriers", "delivery", "riders"):
        courier_query: dict[str, Any] = {
            "$or": [
                {"verification_status": {"$in": ["PENDING_VERIFICATION", "pending"]}},
                {"verification_status": {"$exists": False}},
            ]
        }
        if pt == "students":
            courier_query["courier_type"] = CourierType.STUDENT.value
        elif pt in ("externals", "riders"):
            courier_query["courier_type"] = CourierType.EXTERNAL_GIG.value

        async for doc in database["delivery_partners"].find(courier_query).sort("created_at", -1):
            results.append({
                "id": str(doc["_id"]),
                "partner_category": "COURIER",
                "vendor_type": None,
                "courier_type": doc.get("courier_type") or ("STUDENT" if doc.get("student_details") else "EXTERNAL_GIG"),
                "business_name": None,
                "applicant_name": doc.get("full_name") or doc.get("name") or "Courier Runner",
                "email": doc.get("email") or "",
                "phone": doc.get("phone") or "",
                "address": doc.get("address") or "",
                "is_inside_campus": True,
                "compliance_doc_type": None,
                "compliance_doc_url": None,
                "kitchen_or_stall_photo_url": None,
                "id_proof_type": doc.get("id_proof_type") or "STUDENT_ID",
                "id_proof_doc_url": doc.get("id_proof_doc_url") or "",
                "student_details": doc.get("student_details"),
                "transit_mode": doc.get("transit_mode") or doc.get("vehicle_type") or "BICYCLE",
                "vehicle_number": doc.get("vehicle_number") or "",
                "bank_details": None,
                "upi_id": doc.get("payout_upi_id") or "",
                "emergency_contact_phone": doc.get("emergency_contact_phone") or "",
                "verification_status": doc.get("verification_status") or "PENDING_VERIFICATION",
                "rejection_reason": doc.get("rejection_reason"),
                "created_at": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at") or ""),
            })

    return {
        "success": True,
        "total": len(results),
        "items": results,
    }


@router.post("/admin/verifications/{partner_type}/{partner_id}/decision")
async def process_verification_decision(
    partner_type: str,
    partner_id: str,
    payload: VerificationDecisionRequest,
    _: Annotated[dict, Depends(require_roles(ADMIN))],
):
    """
    Approve, reject, or suspend a partner onboarding application.
    Transitioning to APPROVED unlocks menu publish / order dispatch.
    """
    norm_type = partner_type.lower().strip()
    try:
        oid = ObjectId(partner_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid partner ID format.")

    now = datetime.now(UTC)
    action = payload.action.upper()
    next_status = (
        VerificationStatus.APPROVED.value
        if action == "APPROVE"
        else (VerificationStatus.REJECTED.value if action == "REJECT" else VerificationStatus.SUSPENDED.value)
    )

    update_fields = {
        "verification_status": next_status,
        "updated_at": now,
    }
    if action == "APPROVE":
        update_fields["is_active"] = True
        update_fields["verified_at"] = now
        update_fields["rejection_reason"] = None
    elif action == "REJECT":
        update_fields["is_active"] = False
        update_fields["rejection_reason"] = payload.rejection_reason or "Application did not meet compliance criteria."
    elif action == "SUSPEND":
        update_fields["is_active"] = False
        update_fields["rejection_reason"] = payload.rejection_reason or "Account suspended by platform admin."

    if norm_type in ("restaurant", "restaurants", "vendor", "canteen", "tiffin", "stall"):
        res = await database["restaurants"].find_one_and_update(
            {"_id": oid},
            {"$set": update_fields},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Restaurant applicant not found.")

        # Also update restaurant_owners collection
        await database["restaurant_owners"].update_many(
            {"$or": [{"restaurant_id": partner_id}, {"email": res.get("email")}]},
            {"$set": update_fields},
        )

        return {
            "success": True,
            "message": f"Restaurant {res.get('name', '')} {action.lower()}d successfully.",
            "partner_id": partner_id,
            "verification_status": next_status,
        }

    elif norm_type in ("courier", "couriers", "delivery", "delivery_partner", "delivery_partners", "rider"):
        res = await database["delivery_partners"].find_one_and_update(
            {"_id": oid},
            {"$set": update_fields},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Courier applicant not found.")

        return {
            "success": True,
            "message": f"Courier {res.get('name', '')} {action.lower()}d successfully.",
            "partner_id": partner_id,
            "verification_status": next_status,
        }

    else:
        raise HTTPException(status_code=400, detail="Unknown partner type. Must be 'restaurant' or 'courier'.")
