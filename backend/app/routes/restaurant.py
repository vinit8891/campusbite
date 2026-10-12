from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.auth import assert_same_identity, require_roles
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.core.audit import log_admin_action
from app.core.logging import get_logger
from app.core.sanitize import sanitize_email, sanitize_search_query
from app.schemas.restaurant import Restaurant, RestaurantUpdate
from app.models.restaurant import (
    create_restaurant,
    get_all_restaurants,
    get_restaurant_by_id,
    update_restaurant,
    delete_restaurant,
)

router = APIRouter(tags=["Restaurants"])

logger = get_logger(__name__)

OWNER_PROFILE_FIELDS = {
    "name",
    "description",
    "address",
    "phone",
    "cuisine",
    "cuisine_type",
    "opening_hours",
    "closing_hours",
    "opening_time",
    "closing_time",
    "image",
    "banner_image",
    "image_url",
    "is_active",
    "is_accepting_orders",
}


@router.post("/")
async def add_restaurant(
    restaurant: Restaurant,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    logger.info("restaurants.create request received")
    restaurant_data = restaurant.model_dump(exclude_none=True)
    restaurant_data.setdefault("is_verified", True)
    restaurant_data.setdefault("verification_status", "approved")
    restaurant_data.setdefault("is_active", True)

    restaurant_id = await create_restaurant(restaurant_data)

    await log_admin_action(
        admin_email=current_user.get("email") or "",
        action="restaurant.create",
        resource="restaurant",
        resource_id=restaurant_id,
    )

    logger.info("restaurants.create completed successfully")
    return {
        "message": "Restaurant added successfully",
        "id": restaurant_id,
    }


@router.get("/")
async def fetch_restaurants(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    email: Annotated[str | None, Query()] = None,
    slug: Annotated[str | None, Query()] = None,
    include_menu: Annotated[bool, Query()] = True,
    only_verified: Annotated[bool, Query()] = True,
):
    logger.info("restaurants.list request received")
    result = await get_all_restaurants(
        page=page,
        limit=limit,
        q=sanitize_search_query(q),
        category=(category.strip().lower() if category else None),
        email=sanitize_email(email),
        slug=(slug.strip() if slug else None),
        include_menu=include_menu,
        only_verified=only_verified,
    )
    logger.info("restaurants.list completed successfully")
    return result


# ----------------------------------------
# Settlements Endpoints (Declared before /{restaurant_id} to prevent path shadowing)
# ----------------------------------------

@router.get("/settlements/today")
async def get_restaurant_today_settlement(
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
    date: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
    restaurant_id: Annotated[str | None, Query()] = None,
    canteen_id: Annotated[str | None, Query()] = None,
):
    """
    Returns today's live settlement accruals for a canteen leading up to the 9:00 PM batch payout.
    """
    from app.services.settlement_service import calculate_canteen_daily_settlement

    role = current_user.get("role")
    user_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    target_id = restaurant_id or canteen_id
    target_email = None

    if role == RESTAURANT_OWNER:
        target_email = user_email
    elif restaurant_email:
        target_email = restaurant_email.strip().lower()
    elif target_id:
        if "@" in target_id:
            target_email = target_id.strip().lower()
        else:
            try:
                r_doc = await get_restaurant_by_id(target_id)
                if r_doc and r_doc.get("email"):
                    target_email = r_doc["email"].strip().lower()
                elif r_doc and r_doc.get("name"):
                    target_email = r_doc["name"]
            except Exception:
                pass
            if not target_email:
                target_email = target_id

    if not target_email:
        target_email = user_email

    today_res = await calculate_canteen_daily_settlement(
        restaurant_email=target_email,
        target_date=date,
    )
    if today_res.get("status") == "paid" or today_res.get("is_settled"):
        today_res["status"] = "paid"
        today_res["is_settled"] = True
        today_res["utr_number"] = today_res.get("utr_number") or today_res.get("transaction_ref") or "UPI/CAMPUS/2026"
        today_res["transaction_ref"] = today_res["utr_number"]
    return today_res


@router.get("/settlements/today/{restaurant_id}")
async def get_restaurant_today_settlement_by_id(
    restaurant_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
    date: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
):
    return await get_restaurant_today_settlement(
        current_user=current_user,
        date=date,
        restaurant_email=restaurant_email,
        restaurant_id=restaurant_id,
    )


@router.get("/settlements/export")
@router.get("/settlements/{canteen_id}/export")
async def export_restaurant_settlement(
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
    canteen_id: str | None = None,
    date: Annotated[str | None, Query()] = None,
    format: Annotated[str, Query()] = "csv",
    restaurant_id: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
):
    """
    Generates downloadable CSV or JSON daily settlement summary for the canteen owner.
    """
    from fastapi.responses import PlainTextResponse
    from app.services.settlement_service import generate_canteen_settlement_export

    role = current_user.get("role")
    user_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    target_id = canteen_id or restaurant_id or restaurant_email
    target = user_email if role == RESTAURANT_OWNER or not target_id else target_id.strip()

    result = await generate_canteen_settlement_export(
        canteen_id_or_email=target,
        target_date=date,
        format_type=format,
    )

    if format.lower() == "json":
        return result

    return PlainTextResponse(
        content=result,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=settlement_slip_{date or 'today'}.csv"
        },
    )


@router.get("/settlements/history")
@router.get("/settlements/my")
@router.get("/settlements")
async def fetch_restaurant_settlements(
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
    date: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
    restaurant_id: Annotated[str | None, Query()] = None,
    canteen_id: Annotated[str | None, Query()] = None,
):
    """
    Fetches daily settlement records for a restaurant/canteen.
    Handles restaurant_email, restaurant_id, or canteen_id as query params.
    """
    from app.db.database import database

    role = current_user.get("role")
    user_email = (
        current_user.get("email") or current_user.get("sub") or ""
    ).strip().lower()

    target_id = restaurant_id or canteen_id
    resolved_email = restaurant_email
    restaurant_name = None

    if target_id and not resolved_email:
        if "@" in target_id:
            resolved_email = target_id.strip().lower()
        else:
            try:
                r_doc = await get_restaurant_by_id(target_id)
                if r_doc:
                    if r_doc.get("email"):
                        resolved_email = r_doc["email"].strip().lower()
                    if r_doc.get("name"):
                        restaurant_name = r_doc["name"]
            except Exception:
                pass

    query = {}
    if role == RESTAURANT_OWNER:
        query["restaurant_email"] = user_email
    elif resolved_email or target_id or restaurant_name:
        or_clauses = []
        if resolved_email:
            or_clauses.append({"restaurant_email": resolved_email.strip().lower()})
        if target_id:
            or_clauses.append({"restaurant_id": target_id})
            or_clauses.append({"canteen_id": target_id})
        if restaurant_name:
            or_clauses.append({"restaurant_name": restaurant_name})
        if len(or_clauses) == 1:
            query.update(or_clauses[0])
        elif len(or_clauses) > 1:
            query["$or"] = or_clauses

    merged_map: dict[str, dict] = {}

    # Query shared settlements collection
    settle_q = dict(query)
    if date:
        settle_q["$or"] = [{"date": date}, {"settlement_date": date}]
    settlements_col = database.get("settlements") if hasattr(database, "get") else (database["settlements"] if "settlements" in database else None)
    if settlements_col is not None:
        async for doc in settlements_col.find(settle_q):
            d_key = doc.get("settlement_date") or doc.get("date") or str(doc.get("_id", ""))
            doc["_id"] = str(doc.get("_id", ""))
            merged_map[d_key] = doc

    # Query canteen_settlements collection
    canteen_q = dict(query)
    if date:
        canteen_q["$or"] = [{"settlement_date": date}, {"date": date}]
    canteen_col = database.get("canteen_settlements") if hasattr(database, "get") else (database["canteen_settlements"] if "canteen_settlements" in database else None)
    if canteen_col is not None:
        async for doc in canteen_col.find(canteen_q):
            d_key = doc.get("settlement_date") or doc.get("date") or str(doc.get("_id", ""))
            doc["_id"] = str(doc.get("_id", ""))
            if d_key in merged_map:
                merged_map[d_key].update({k: v for k, v in doc.items() if v is not None})
            else:
                merged_map[d_key] = doc

    settlements = []
    for doc in merged_map.values():
        is_paid = (
            str(doc.get("status", "")).lower() == "paid"
            or doc.get("is_settled") is True
        )
        if is_paid:
            doc["status"] = "paid"
            doc["is_settled"] = True
            doc["utr_number"] = doc.get("utr_number") or doc.get("transaction_ref") or "UPI/CAMPUS/2026"
            doc["transaction_ref"] = doc["utr_number"]

        gross = float(doc.get("gross_food_sales") or doc.get("gross_sales") or 0.0)
        if gross <= 0.0:
            amt = float(doc.get("amount") or doc.get("net_payout") or doc.get("net_payable_subtotal") or 0.0)
            if amt > 0.0:
                gross = round(amt / 0.87, 2)
        comm = float(doc.get("platform_commission") or doc.get("commission_deducted") or round(gross * 0.18, 2))
        gst = float(doc.get("gst") or doc.get("gst_amount") or round(gross * 0.05, 2))
        net = float(doc.get("net_payable_subtotal") or doc.get("net_payout") or round(gross + gst - comm, 2))

        doc["gross_food_sales"] = gross
        doc["gross_sales"] = gross
        doc["platform_commission"] = comm
        doc["commission"] = comm
        doc["commission_deducted"] = comm
        doc["gst"] = gst
        doc["gst_amount"] = gst
        doc["net_payable_subtotal"] = net
        doc["net_payout"] = net
        settlements.append(doc)

    settlements.sort(key=lambda x: str(x.get("settlement_date") or x.get("date") or ""), reverse=True)
    return {"settlements": settlements}


@router.get("/settlements/history/{restaurant_id}")
async def fetch_restaurant_settlements_history_by_id(
    restaurant_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
    date: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
):
    return await fetch_restaurant_settlements(
        current_user=current_user,
        date=date,
        restaurant_email=restaurant_email,
        restaurant_id=restaurant_id,
    )


@router.get("/settlements/{restaurant_id}")
async def fetch_restaurant_settlements_by_id(
    restaurant_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
    date: Annotated[str | None, Query()] = None,
    restaurant_email: Annotated[str | None, Query()] = None,
):
    return await fetch_restaurant_settlements(
        current_user=current_user,
        date=date,
        restaurant_email=restaurant_email,
        restaurant_id=restaurant_id,
    )


@router.get("/{restaurant_id}")
async def fetch_restaurant_by_id(
    restaurant_id: str,
    include_menu: Annotated[bool, Query()] = True,
):
    logger.info("restaurants.get_by_id request received")
    restaurant = await get_restaurant_by_id(
        restaurant_id, include_menu=include_menu
    )

    if not restaurant:
        raise HTTPException(
            status_code=404,
            detail="Restaurant not found",
        )

    logger.info("restaurants.get_by_id completed successfully")
    return restaurant


@router.put("/{restaurant_id}")
async def edit_restaurant(
    restaurant_id: str,
    restaurant: RestaurantUpdate,
    current_user: Annotated[
        dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER))
    ],
):
    logger.info("restaurants.update request received")
    existing = await get_restaurant_by_id(restaurant_id)

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Restaurant not found",
        )

    role = current_user.get("role")
    raw = restaurant.model_dump(exclude_unset=True)

    # Normalize aliases across frontend naming conventions
    if "cuisine_type" in raw and "cuisine" not in raw:
        raw["cuisine"] = raw["cuisine_type"]
    elif "cuisine" in raw and "cuisine_type" not in raw:
        raw["cuisine_type"] = raw["cuisine"]

    if "banner_image" in raw and "image" not in raw:
        raw["image"] = raw["banner_image"]
    if "image_url" in raw and "image" not in raw:
        raw["image"] = raw["image_url"]
    if "image" in raw:
        if "image_url" not in raw:
            raw["image_url"] = raw["image"]
        if "banner_image" not in raw:
            raw["banner_image"] = raw["image"]

    if "opening_time" in raw and "opening_hours" not in raw:
        raw["opening_hours"] = raw["opening_time"]
    elif "opening_hours" in raw and "opening_time" not in raw:
        raw["opening_time"] = raw["opening_hours"]

    if "closing_time" in raw and "closing_hours" not in raw:
        raw["closing_hours"] = raw["closing_time"]
    elif "closing_hours" in raw and "closing_time" not in raw:
        raw["closing_time"] = raw["closing_hours"]

    if role == RESTAURANT_OWNER:
        assert_same_identity(
            current_user,
            email=existing.get("email"),
        )

        data = {
            key: value
            for key, value in raw.items()
            if key in OWNER_PROFILE_FIELDS and value is not None
        }

        if not data:
            raise HTTPException(
                status_code=400,
                detail="No profile fields to update",
            )
    else:
        # Admin: only apply provided fields so omitted profile keys stay intact
        data = {key: value for key, value in raw.items() if value is not None}

    await update_restaurant(restaurant_id, data)

    if role == ADMIN:
        await log_admin_action(
            admin_email=current_user.get("email") or "",
            action="restaurant.update",
            resource="restaurant",
            resource_id=restaurant_id,
        )

    logger.info("restaurants.update completed successfully")
    return {
        "message": "Restaurant updated successfully"
    }


@router.delete("/{restaurant_id}")
async def remove_restaurant(
    restaurant_id: str,
    current_user: Annotated[dict, Depends(require_roles(ADMIN))],
):
    logger.info("restaurants.delete request received")
    deleted = await delete_restaurant(restaurant_id)

    if deleted == 0:
        return {
            "message": "Restaurant not found"
        }

    await log_admin_action(
        admin_email=current_user.get("email") or "",
        action="restaurant.delete",
        resource="restaurant",
        resource_id=restaurant_id,
    )

    logger.info("restaurants.delete completed successfully")
    return {
        "message": "Restaurant deleted successfully"
    }


