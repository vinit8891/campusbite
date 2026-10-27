from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Annotated, Any, Optional
from bson import ObjectId

import re
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from app.auth.auth import get_current_user, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.db.database import database
from app.schemas.agreement import (
    AgreementStatusResponse,
    MerchantAgreementAcceptance,
)
from app.services.pdf_generator import generate_merchant_agreement_pdf

logger = get_logger(__name__)

TERMS_TEXT_V1 = """CAMPUSBITE MERCHANT PARTNER MASTER AGREEMENT (v1.0_2026_OCT)

This Merchant Partner Agreement ("Agreement") constitutes an electronic contract pursuant to Section 10A of the Information Technology Act, 2000 and rules framed thereunder, establishing legally binding commercial terms between CampusBite ("Platform / Intermediary") and the Registered Canteen Operator ("Merchant" or "Vendor").

1. COMMERCIAL TERMS & PLATFORM COMMISSION
1.1 Platform Commission Take-Rate: The Merchant agrees to pay CampusBite a platform commission (take-rate) of 18% (eighteen percent) calculated on the gross food value (subtotal of all culinary items before customer delivery fees or platform discounts) of each successfully completed order.
1.2 Taxation & GST: Goods and Services Tax (GST) and statutory Tax Collected at Source (TCS) / Tax Deducted at Source (TDS) under Section 194-O of the Income Tax Act, 1961 shall be applied and deducted as mandated by Indian Law.

2. SETTLEMENT CYCLE & DISBURSAL SCHEDULE
2.1 Daily End-of-Day (EOD) Ledger: Order reconciliation and settlement accruals close daily at 9:00 PM IST (EOD Cutoff). Orders completed after 9:00 PM IST accrue into the subsequent business day ledger.
2.2 Disbursal Days (T+2 Business Days): Net accrued earnings are disbursed twice weekly on Tuesday and Friday via automated UPI / IMPS / NEFT transfer directly to the Merchant's registered and verified nodal bank account.
2.3 Withholding & Offsets: CampusBite reserves the right to offset refunds, unfulfilled orders, and customer dispute reimbursements against subsequent settlement tranches.

3. FOOD SAFETY, FSSAI COMPLIANCE & EXCLUSIVE VENDOR LIABILITY
3.1 Mandatory FSSAI Registration: The Merchant certifies that it possesses a valid, active 14-digit FSSAI (Food Safety and Standards Authority of India) license/registration and shall prominently display the license on premise and within the Platform.
3.2 Sole Liability: The Merchant assumes 100% sole civil, criminal, and regulatory liability for food quality, preparation hygiene, accurate allergen and vegetarian/non-vegetarian disclosures, contamination, packaging integrity, and adherence to the Food Safety and Standards Act, 2006.
3.3 Indemnity: The Merchant shall indemnify, defend, and hold harmless CampusBite, its directors, and officers against any third-party claim, fine, legal notice, consumer court proceeding, or penalty arising from culinary products sold by the Merchant.

4. INTERMEDIARY STATUS & SAFE HARBOUR UNDER IT ACT SECTION 79
4.1 Intermediary Scope: CampusBite operates strictly as a digital marketplace intermediary facilitating discovery, payment processing, and on-campus courier dispatch pursuant to Section 79 of the Information Technology Act, 2000.
4.2 Safe Harbour: CampusBite does not own, produce, inspect, or package culinary goods and exercises intermediary safe harbour protections against vendor inventory defaults.

5. AFFIRMATIVE CONSENT & CRYPTOGRAPHIC AUDIT TRAIL
5.1 Electronic Execution: By clicking "Execute & Accept Agreement", the signatory certifies under penalty of perjury that they are the authorized proprietor, partner, or legal representative of the establishment.
5.2 Immutable Record: An auditable digital record comprising the signatory identity, mobile verification, 14-digit FSSAI license, SHA-256 agreement hash, client IP address, and cryptographic timestamp is permanently recorded in the immutable platform ledger.
"""

# Calculate dynamic SHA-256 hash of the exact terms
TERMS_HASH = hashlib.sha256(TERMS_TEXT_V1.encode("utf-8")).hexdigest()

router = APIRouter(
    prefix="/api/partner",
    tags=["Partner Agreement"],
)

alias_router = APIRouter(
    prefix="/partner",
    tags=["Partner Agreement"],
)


def _build_canteen_query(identifier: str) -> dict:
    clean_id = (identifier or "").strip()
    clauses: list[dict[str, Any]] = [
        {"email": clean_id},
        {"slug": clean_id},
        {"canteen_id": clean_id},
        {"_id": clean_id},
    ]
    if ObjectId.is_valid(clean_id):
        clauses.append({"_id": ObjectId(clean_id)})
    return {"$or": clauses}


async def ensure_agreement_signed(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """
    Dependency that inspects the authenticated canteen's document in MongoDB.
    If agreement_signed is not True, raises HTTPException 403 Forbidden.
    """
    # Admins bypass the agreement check
    if current_user.get("role") == ADMIN:
        return current_user

    user_email = current_user.get("email") or current_user.get("sub")
    user_id = current_user.get("sub")

    query_conditions: list[dict[str, Any]] = []
    if user_email:
        query_conditions.append({"email": user_email})
        query_conditions.append({"owner_email": user_email})
        query_conditions.append({"slug": user_email})
    if user_id:
        if ObjectId.is_valid(user_id):
            query_conditions.append({"_id": ObjectId(user_id)})
            query_conditions.append({"owner_id": ObjectId(user_id)})
        query_conditions.append({"_id": user_id})
        query_conditions.append({"owner_id": user_id})
        query_conditions.append({"user_id": user_id})

    canteen = None
    if query_conditions:
        query = {"$or": query_conditions}
        canteen = await database["canteens"].find_one(query)
        if not canteen:
            canteen = await database["restaurants"].find_one(query)

    # Fallback to users collection if flagged directly on user
    if not canteen and user_email:
        canteen = await database["users"].find_one({"email": user_email})

    if not canteen or canteen.get("agreement_signed") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant agreement pending signature",
        )

    return current_user


@router.post("/accept-agreement")
@alias_router.post("/accept-agreement")
async def accept_agreement(
    request: Request,
    payload: MerchantAgreementAcceptance,
):
    """
    Records legally binding click-wrap agreement acceptance in MongoDB:
    1. Extracts client IP handling reverse proxies (x-forwarded-for).
    2. Extracts User-Agent header.
    3. Populates SHA-256 agreement hash and execution timestamp.
    4. Inserts immutable audit log entry into merchant_agreements.
    5. Updates canteen record with agreement_signed=True, fssai_number, version, and timestamp.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "127.0.0.1"

    user_agent = (
        request.headers.get("user-agent")
        or request.headers.get("User-Agent")
        or "Unknown"
    )

    now_utc = datetime.now(timezone.utc)

    # Set calculated cryptographic hash and network telemetry
    payload.agreement_hash = TERMS_HASH
    payload.ip_address = client_ip
    payload.user_agent = user_agent
    payload.accepted_at = now_utc
    payload.status = "LEGALLY_EXECUTED"

    # 1. Insert immutable audit record into merchant_agreements
    audit_record = payload.model_dump()
    await database["merchant_agreements"].insert_one(audit_record)

    # 2. Update canteen document in MongoDB
    canteen_query = _build_canteen_query(payload.canteen_id)
    update_doc = {
        "$set": {
            "agreement_signed": True,
            "fssai_number": payload.canteen_fssai_number,
            "agreement_version": payload.terms_version or "v1.0_2026_OCT",
            "agreement_signed_at": now_utc,
        }
    }

    # Update in canteens collection
    canteen_res = await database["canteens"].update_one(canteen_query, update_doc)

    if canteen_res.matched_count == 0:
        # If not present in canteens, copy/upsert from restaurants collection or create
        rest_doc = await database["restaurants"].find_one(canteen_query)
        if rest_doc:
            rest_doc["agreement_signed"] = True
            rest_doc["fssai_number"] = payload.canteen_fssai_number
            rest_doc["agreement_version"] = payload.terms_version or "v1.0_2026_OCT"
            rest_doc["agreement_signed_at"] = now_utc
            await database["canteens"].update_one(canteen_query, {"$set": rest_doc}, upsert=True)
        else:
            await database["canteens"].update_one(
                {"_id": payload.canteen_id},
                {
                    "$set": {
                        "_id": payload.canteen_id,
                        "canteen_id": payload.canteen_id,
                        "agreement_signed": True,
                        "fssai_number": payload.canteen_fssai_number,
                        "agreement_version": payload.terms_version or "v1.0_2026_OCT",
                        "agreement_signed_at": now_utc,
                    }
                },
                upsert=True,
            )

    # Keep restaurants collection synchronized
    await database["restaurants"].update_one(canteen_query, update_doc)

    # Also synchronize user document if matched by email
    await database["users"].update_one({"email": payload.canteen_id}, update_doc)

    logger.info(
        "merchant.agreement_accepted canteen_id=%s signatory=%s fssai=%s ip=%s",
        payload.canteen_id,
        payload.signatory_name,
        payload.canteen_fssai_number,
        client_ip,
    )

    return {"status": "success", "message": "Agreement recorded successfully"}


@router.get("/agreement-status", response_model=AgreementStatusResponse)
@alias_router.get("/agreement-status", response_model=AgreementStatusResponse)
async def get_agreement_status(
    canteen_id: Annotated[Optional[str], Query()] = None,
    current_user: Annotated[Optional[dict], Depends(get_current_user)] = None,
):
    """
    Returns whether the merchant partner has executed the master agreement,
    along with current legal terms text and SHA-256 hash.
    """
    lookup_id = canteen_id
    if not lookup_id and current_user:
        lookup_id = current_user.get("email") or current_user.get("sub")

    canteen = None
    if lookup_id:
        query = _build_canteen_query(lookup_id)
        canteen = await database["canteens"].find_one(query)
        if not canteen:
            canteen = await database["restaurants"].find_one(query)

    is_signed = bool(canteen.get("agreement_signed", False)) if canteen else False

    return AgreementStatusResponse(
        agreement_signed=is_signed,
        canteen_id=str(canteen.get("_id", lookup_id or "")) if canteen else lookup_id,
        canteen_name=canteen.get("name") if canteen else None,
        fssai_number=canteen.get("fssai_number") if canteen else None,
        agreement_version=canteen.get("agreement_version", "v1.0_2026_OCT") if canteen else "v1.0_2026_OCT",
        agreement_signed_at=canteen.get("agreement_signed_at") if canteen else None,
        terms_text=TERMS_TEXT_V1,
        terms_hash=TERMS_HASH,
    )


# -------------------------------------------------------------
# Protected Vendor Routes: Blocked if agreement is not executed
# -------------------------------------------------------------

@router.get("/orders")
@alias_router.get("/orders")
async def get_partner_orders(
    current_user: Annotated[dict, Depends(ensure_agreement_signed)],
    status_filter: Annotated[Optional[str], Query()] = None,
):
    """Protected partner orders / KDS queue route."""
    user_email = current_user.get("email") or current_user.get("sub")
    query: dict[str, Any] = {"restaurant_email": user_email}
    if status_filter:
        query["status"] = status_filter

    orders_cursor = database["orders"].find(query).sort("created_at", -1)
    orders = await orders_cursor.to_list(100)
    for o in orders:
        o["_id"] = str(o["_id"])
    return {"orders": orders, "count": len(orders)}


@router.post("/orders")
@alias_router.post("/orders")
async def post_partner_orders(
    current_user: Annotated[dict, Depends(ensure_agreement_signed)],
):
    """Protected vendor orders endpoint."""
    return await get_partner_orders(current_user=current_user)


@router.post("/menu/update")
@alias_router.post("/menu/update")
@router.put("/menu/update")
@alias_router.put("/menu/update")
async def update_partner_menu(
    payload: dict,
    current_user: Annotated[dict, Depends(ensure_agreement_signed)],
):
    """Protected vendor menu management update route."""
    user_email = current_user.get("email") or current_user.get("sub")
    item_id = payload.get("item_id") or payload.get("id")

    if not item_id:
        raise HTTPException(status_code=400, detail="Item ID is required for menu update")

    query: dict[str, Any] = {"restaurant_email": user_email}
    if ObjectId.is_valid(item_id):
        query["_id"] = ObjectId(item_id)
    else:
        query["_id"] = item_id

    update_fields = {k: v for k, v in payload.items() if k not in {"_id", "id", "item_id"}}
    update_fields["updated_at"] = datetime.now(timezone.utc)

    res = await database["menu"].update_one(query, {"$set": update_fields})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found for this partner")

    return {"status": "success", "message": "Menu item updated successfully"}


@router.get("/agreement/download-pdf/{canteen_id}")
@alias_router.get("/agreement/download-pdf/{canteen_id}")
async def download_agreement_pdf(
    canteen_id: str,
):
    """
    Automated PDF Export Route:
    Generates and streams a legally executed A4 MoU PDF for the specified canteen.
    """
    clean_id = (canteen_id or "").strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Canteen ID is required")

    # 1. Query merchant_agreements in MongoDB
    agreement = await database["merchant_agreements"].find_one(
        {"$or": [{"canteen_id": clean_id}, {"email": clean_id}]},
        sort=[("accepted_at", -1)],
    )

    # 2. Query canteen / restaurant document for business profile details
    canteen_doc = await database["canteens"].find_one(_build_canteen_query(clean_id))
    if not canteen_doc:
        canteen_doc = await database["restaurants"].find_one(_build_canteen_query(clean_id))

    if not agreement:
        # Check if canteen document exists and is signed
        if canteen_doc and canteen_doc.get("agreement_signed"):
            agreement = {
                "canteen_id": clean_id,
                "signatory_name": canteen_doc.get("owner_name") or canteen_doc.get("name") or "Authorized Signatory",
                "signatory_designation": "Proprietor",
                "signatory_phone": canteen_doc.get("phone") or "N/A",
                "canteen_fssai_number": canteen_doc.get("fssai_number") or "Pending Registration",
                "terms_version": canteen_doc.get("agreement_version", "v1.0_2026_OCT"),
                "agreement_hash": TERMS_HASH,
                "accepted_at": canteen_doc.get("agreement_signed_at") or datetime.now(timezone.utc),
                "ip_address": "127.0.0.1",
                "user_agent": "CampusBite Secure Client",
                "status": "LEGALLY_EXECUTED",
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Merchant agreement record not found for this canteen",
            )

    if not canteen_doc:
        canteen_doc = {
            "name": agreement.get("signatory_name") or clean_id,
            "_id": clean_id,
            "fssai_number": agreement.get("canteen_fssai_number"),
            "phone": agreement.get("signatory_phone"),
        }

    raw_canteen_name = canteen_doc.get("name") or agreement.get("signatory_name") or clean_id
    safe_name = re.sub(r"[^\w\-_]", "_", raw_canteen_name.strip()).strip("_") or "Canteen"
    filename = f"CampusBite_Agreement_{safe_name}.pdf"

    pdf_buffer = generate_merchant_agreement_pdf(agreement, canteen_doc)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )
