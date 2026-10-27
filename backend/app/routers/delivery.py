from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Annotated, Any, Optional
from bson import ObjectId

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from app.auth.auth import get_current_user, require_roles
from app.auth.roles import ADMIN, DELIVERY_PARTNER
from app.core.logging import get_logger
from app.db.database import database
from app.schemas.runner_agreement import (
    RunnerAgreementAcceptance,
    RunnerAgreementStatusResponse,
)
from app.services.pdf_generator import generate_runner_agreement_pdf

logger = get_logger(__name__)

RUNNER_TERMS_TEXT_V1 = """CAMPUSBITE LOGISTICS ASSOCIATE & WORK-STUDY AGREEMENT (v1.0_RUNNER_2026_OCT)

This Campus Runner & Operations Associate Agreement ("Agreement") constitutes an electronic contract pursuant to Section 10A of the Information Technology Act, 2000 and rules framed thereunder, establishing legally binding engagement terms between CampusBite Technologies Private Limited ("Platform") and the Registered Delivery Associate ("Runner" or "Associate").

1. INDEPENDENT ASSOCIATE STATUS & WORK-STUDY ENGAGEMENT
1.1 Peer Delivery Model: The Associate is onboarded as an independent peer delivery partner under a flexible on-campus work-study engagement. Nothing in this Agreement creates any relationship of employment, partnership, joint venture, or agency between CampusBite and the Associate.
1.2 Schedule Autonomy: The Associate exercises sole discretion over when to log in, toggle active duty, select delivery shifts via the Mess Roster System, and accept available delivery runs.

2. COMPENSATION, BATCH SURGES & TIP PASS-THROUGH
2.1 Earnings Model: Compensation is computed dynamically per fulfilled delivery comprising: (a) base delivery fee per completed drop, (b) cluster batch bonus (+₹20/drop) for aggregated hostel/mess drops, and (c) 100% of discretionary customer tips.
2.2 Disbursal Schedule: Net courier earnings are disbursed directly to the Associate's registered UPI handle on scheduled bi-weekly settlement cycles (Tuesday and Friday) subject to applicable tax deductions under Section 194-C / 194-O of the Income Tax Act, 1961.

3. MANDATORY GATE / LOBBY DROP SAFETY POLICY
3.1 Zero Room Entry: To ensure campus safety and privacy compliance, all food order dropoffs must strictly occur at designated hostel entrance gates, security checkpoints, or ground-floor academic lobbies.
3.2 Strict Prohibition: Associates are strictly prohibited from entering student residential rooms, private corridors, or unauthorized hostel blocks. Violation results in immediate permanent blacklisting.

4. CASH-ON-DELIVERY (COD) & CASH-IN-HAND (CIH) THRESHOLD
4.1 Fiduciary Custody: Physical currency collected on Cash-on-Delivery (COD) orders is held in trust for CampusBite and does not constitute courier remuneration.
4.2 ₹500 CIH Lockout: The Associate must not accumulate more than ₹500 in unremitted cash-in-hand. Upon crossing ₹500, new order claiming is automatically locked until dues are remitted via the platform UPI QR code.

5. CODE OF CONDUCT, TAMPER SEALS & CAMPUS SAFETY
5.1 Seal Integrity: Associates must verify that merchant food packaging tamper-evident seals are fully intact prior to canteen departure. Handover requires customer validation via 4-digit OTP.
5.2 Safety & Conduct: Associates must follow campus pedestrian speed limits, exercise road safety with bicycles/scooters, and treat students, canteen staff, and campus security personnel with professional courtesy.

6. LOGISTICS INTERNSHIP CERTIFICATION MILESTONE
6.1 Certificate Eligibility: Upon completing 50 verified customer deliveries maintaining an average rating of 4.5/5.0 with zero hygiene or tampering infractions, CampusBite shall issue an official "Certificate of Startup Operations & Hyperlocal Logistics Internship" recognizing verified operational experience.

7. AFFIRMATIVE CONSENT & CRYPTOGRAPHIC AUDIT RECORD
7.1 Electronic Execution: Ticking the affirmative consent box and clicking "Execute & Accept Agreement" constitutes a legally enforceable electronic signature under Section 10A of the IT Act, 2000.
7.2 Immutable Audit Trail: Acceptance timestamp, client IP address, user-agent string, UPI handle, and the SHA-256 digest of these terms are permanently logged in the CampusBite immutable audit ledger.
"""

# Dynamic SHA-256 Hash of exact runner terms
RUNNER_TERMS_HASH = hashlib.sha256(RUNNER_TERMS_TEXT_V1.encode("utf-8")).hexdigest()

router = APIRouter(
    prefix="/api/delivery",
    tags=["Delivery Runner Agreement"],
)

alias_router = APIRouter(
    prefix="/delivery",
    tags=["Delivery Runner Agreement (Alias)"],
)


def _build_runner_query(identifier: str) -> dict[str, Any]:
    """Helper to query runner documents across multiple possible identifiers."""
    clean_id = (identifier or "").strip()
    clauses: list[dict[str, Any]] = [
        {"phone": clean_id},
        {"email": clean_id},
        {"runner_id": clean_id},
        {"_id": clean_id},
    ]
    if ObjectId.is_valid(clean_id):
        clauses.append({"_id": ObjectId(clean_id)})
    return {"$or": clauses}


async def _find_runner_document(identifier: str) -> dict[str, Any] | None:
    """Queries delivery_partners, runners, and users collections for a runner."""
    query = _build_runner_query(identifier)
    for col_name in ("delivery_partners", "runners", "users"):
        doc = await database[col_name].find_one(query)
        if doc:
            return doc
    return None


async def ensure_runner_agreement_signed(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """
    Route Guard Dependency:
    Inspects authenticated runner's document in MongoDB.
    If agreement_signed is not True, raises HTTPException 403 Forbidden.
    Admins bypass this check.
    """
    # Admins bypass agreement signature
    if current_user.get("role") == ADMIN:
        return current_user

    phone = current_user.get("phone")
    email = current_user.get("email")
    sub = current_user.get("sub") or current_user.get("id") or str(current_user.get("_id") or "")

    identifiers = [id_val for id_val in (phone, email, sub) if id_val]

    runner_doc = None
    for ident in identifiers:
        runner_doc = await _find_runner_document(ident)
        if runner_doc:
            break

    if not runner_doc or runner_doc.get("agreement_signed") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Delivery Partner agreement pending signature",
        )

    return current_user


# ------------------------------------------------------------------------------
# Route 1: GET /api/delivery/agreement/status
# ------------------------------------------------------------------------------
@router.get("/agreement/status", response_model=RunnerAgreementStatusResponse)
@alias_router.get("/agreement/status", response_model=RunnerAgreementStatusResponse)
async def get_runner_agreement_status(
    runner_id: Annotated[Optional[str], Query()] = None,
    phone: Annotated[Optional[str], Query()] = None,
    current_user: Annotated[Optional[dict], Depends(get_current_user)] = None,
):
    """
    Returns the legal execution status of the delivery partner agreement.
    """
    target_id = (
        runner_id
        or phone
        or (current_user.get("phone") if current_user else None)
        or (current_user.get("email") if current_user else None)
        or (current_user.get("sub") if current_user else None)
    )

    if not target_id:
        return RunnerAgreementStatusResponse(
            agreement_signed=False,
            terms_text=RUNNER_TERMS_TEXT_V1,
            terms_hash=RUNNER_TERMS_HASH,
        )

    runner_doc = await _find_runner_document(target_id)
    agreement_doc = await database["runner_agreements"].find_one(
        {"$or": [{"runner_id": target_id}, {"phone": target_id}, {"email": target_id}]},
        sort=[("accepted_at", -1)],
    )

    is_signed = bool(
        (agreement_doc and agreement_doc.get("status") == "LEGALLY_EXECUTED")
        or (runner_doc and runner_doc.get("agreement_signed") is True)
    )

    full_name = None
    user_phone = None
    upi_id = None
    college_id = None
    agreement_version = "v1.0_RUNNER_2026_OCT"
    accepted_at = None

    if agreement_doc:
        full_name = agreement_doc.get("full_name")
        user_phone = agreement_doc.get("phone")
        upi_id = agreement_doc.get("upi_id")
        college_id = agreement_doc.get("college_id_or_seat_no")
        agreement_version = agreement_doc.get("terms_version") or agreement_version
        accepted_at = agreement_doc.get("accepted_at")
    elif runner_doc:
        full_name = runner_doc.get("name") or runner_doc.get("full_name")
        user_phone = runner_doc.get("phone")
        upi_id = runner_doc.get("payout_upi_id") or runner_doc.get("upi_id")
        college_id = runner_doc.get("college_id") or runner_doc.get("roll_no")
        agreement_version = runner_doc.get("agreement_version") or agreement_version
        accepted_at = runner_doc.get("agreement_signed_at")

    return RunnerAgreementStatusResponse(
        agreement_signed=is_signed,
        runner_id=str(target_id),
        full_name=full_name,
        phone=user_phone,
        upi_id=upi_id,
        college_id=college_id,
        agreement_version=agreement_version,
        agreement_signed_at=accepted_at,
        terms_text=RUNNER_TERMS_TEXT_V1,
        terms_hash=RUNNER_TERMS_HASH,
    )


# ------------------------------------------------------------------------------
# Route 2: POST /api/delivery/accept-agreement
# ------------------------------------------------------------------------------
@router.post("/accept-agreement")
@alias_router.post("/accept-agreement")
async def accept_runner_agreement(
    payload: RunnerAgreementAcceptance,
    request: Request,
):
    """
    Submits affirmative consent to the Runner Master Engagement Terms.
    Extracts client IP, user-agent, logs cryptographic audit record, and updates profile.
    """
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "127.0.0.1")
    )
    user_agent = request.headers.get("user-agent", "CampusBite Courier Client")

    accepted_at = payload.accepted_at or datetime.now(timezone.utc)

    # 1. Store immutable audit record
    audit_record = {
        "runner_id": payload.runner_id,
        "full_name": payload.full_name,
        "phone": payload.phone,
        "emergency_contact": payload.emergency_contact,
        "college_id_or_seat_no": payload.college_id_or_seat_no,
        "hostel_block_or_address": payload.hostel_block_or_address,
        "upi_id": payload.upi_id,
        "terms_version": payload.terms_version,
        "agreement_hash": RUNNER_TERMS_HASH,
        "accepted_at": accepted_at,
        "ip_address": client_ip,
        "user_agent": user_agent,
        "status": "LEGALLY_EXECUTED",
    }
    await database["runner_agreements"].insert_one(audit_record)

    # 2. Update runner profile in delivery_partners, runners, and users collections
    update_doc = {
        "$set": {
            "agreement_signed": True,
            "upi_id": payload.upi_id,
            "payout_upi_id": payload.upi_id,
            "college_id": payload.college_id_or_seat_no,
            "emergency_contact": payload.emergency_contact,
            "hostel_block": payload.hostel_block_or_address,
            "agreement_version": payload.terms_version,
            "agreement_signed_at": accepted_at,
        }
    }

    match_query = _build_runner_query(payload.runner_id)
    if payload.phone:
        match_query = {"$or": match_query["$or"] + [{"phone": payload.phone}]}

    for col in ("delivery_partners", "runners", "users"):
        await database[col].update_many(match_query, update_doc)

    logger.info(
        "delivery.agreement.accepted runner=%s name=%s ip=%s",
        payload.runner_id,
        payload.full_name,
        client_ip,
    )

    return {
        "status": "success",
        "message": "Runner agreement recorded successfully",
        "agreement_hash": RUNNER_TERMS_HASH,
        "accepted_at": accepted_at.isoformat(),
    }


# ------------------------------------------------------------------------------
# Route 3: GET /api/delivery/agreement/download-pdf/{runner_id}
# ------------------------------------------------------------------------------
@router.get("/agreement/download-pdf/{runner_id}")
@alias_router.get("/agreement/download-pdf/{runner_id}")
async def download_runner_agreement_pdf(runner_id: str):
    """
    Automated PDF Export Route:
    Generates and streams a legally executed A4 MoU PDF for the campus runner.
    """
    clean_id = (runner_id or "").strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Runner ID is required")

    # 1. Query runner_agreements collection
    agreement = await database["runner_agreements"].find_one(
        {"$or": [{"runner_id": clean_id}, {"phone": clean_id}, {"email": clean_id}]},
        sort=[("accepted_at", -1)],
    )

    runner_doc = await _find_runner_document(clean_id)

    if not agreement:
        # Fallback if flagged directly on runner profile
        if runner_doc and runner_doc.get("agreement_signed"):
            agreement = {
                "runner_id": clean_id,
                "full_name": runner_doc.get("name") or runner_doc.get("full_name") or "Campus Runner",
                "phone": runner_doc.get("phone") or "N/A",
                "emergency_contact": runner_doc.get("emergency_contact") or "N/A",
                "college_id_or_seat_no": runner_doc.get("college_id") or runner_doc.get("roll_no") or "Campus Verified",
                "hostel_block_or_address": runner_doc.get("hostel_block") or "Campus Precinct",
                "upi_id": runner_doc.get("payout_upi_id") or runner_doc.get("upi_id") or "N/A",
                "terms_version": runner_doc.get("agreement_version", "v1.0_RUNNER_2026_OCT"),
                "agreement_hash": RUNNER_TERMS_HASH,
                "accepted_at": runner_doc.get("agreement_signed_at") or datetime.now(timezone.utc),
                "ip_address": "127.0.0.1",
                "user_agent": "CampusBite Secure Client",
                "status": "LEGALLY_EXECUTED",
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Runner agreement record not found for this delivery partner",
            )

    if not runner_doc:
        runner_doc = {
            "name": agreement.get("full_name") or clean_id,
            "_id": clean_id,
            "phone": agreement.get("phone"),
            "college_id": agreement.get("college_id_or_seat_no"),
            "upi_id": agreement.get("upi_id"),
        }

    raw_name = runner_doc.get("name") or runner_doc.get("full_name") or agreement.get("full_name") or clean_id
    safe_name = re.sub(r"[^\w\-_]", "_", raw_name.strip()).strip("_") or "Runner"
    filename = f"CampusBite_Runner_Agreement_{safe_name}.pdf"

    pdf_buffer = generate_runner_agreement_pdf(agreement, runner_doc)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )


# ------------------------------------------------------------------------------
# Protected Courier Endpoints (Guarded by ensure_runner_agreement_signed)
# ------------------------------------------------------------------------------
@router.get("/orders/available")
@alias_router.get("/orders/available")
async def get_guarded_available_orders(
    current_user: Annotated[dict, Depends(ensure_runner_agreement_signed)],
    q: Annotated[Optional[str], Query()] = None,
    restaurant: Annotated[Optional[str], Query()] = None,
    payment_method: Annotated[Optional[str], Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """
    Fetch available runs/orders for couriers.
    Guarded by ensure_runner_agreement_signed (blocks with 403 if agreement not signed).
    """
    from app.models.order import get_available_orders
    from app.core.sanitize import sanitize_search_query
    from app.routes.order import _public_paginated

    return _public_paginated(
        await get_available_orders(
            q=sanitize_search_query(q),
            restaurant=restaurant,
            payment_method=payment_method,
            page=page,
            limit=limit,
        )
    )


@router.post("/orders/{order_id}/accept")
@router.put("/orders/{order_id}/accept")
@alias_router.post("/orders/{order_id}/accept")
@alias_router.put("/orders/{order_id}/accept")
async def accept_guarded_delivery_order(
    order_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(ensure_runner_agreement_signed)],
    partner: dict | None = Body(default=None),
):
    """
    Accepts / claims an order run for delivery.
    Guarded by ensure_runner_agreement_signed.
    """
    from app.routes.order import accept_delivery
    return await accept_delivery(
        order_id=order_id,
        background_tasks=background_tasks,
        current_user=current_user,
        partner=partner,
    )


@router.post("/orders/{order_id}/complete")
@router.put("/orders/{order_id}/complete")
@alias_router.post("/orders/{order_id}/complete")
@alias_router.put("/orders/{order_id}/complete")
async def complete_guarded_delivery_order(
    order_id: str,
    current_user: Annotated[dict, Depends(ensure_runner_agreement_signed)],
    payload: dict | None = Body(default=None),
):
    """
    Marks delivery run complete upon successful recipient handover.
    Guarded by ensure_runner_agreement_signed.
    """
    from app.models.order import update_order_status
    updated = await update_order_status(order_id, "Delivered")
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "success", "message": "Order marked as delivered", "order_id": order_id}

