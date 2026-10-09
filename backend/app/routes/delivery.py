from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException

from app.auth.auth import require_roles
from app.auth.roles import ADMIN, CUSTOMER, DELIVERY_PARTNER, RESTAURANT_OWNER
from app.core.logging import get_logger
from app.models.order import get_order_by_id
from app.services.location_service import (
    get_courier_location_and_proximity,
    update_courier_location_service,
)

router = APIRouter(
    prefix="/delivery",
    tags=["Delivery Location"],
)

logger = get_logger(__name__)


@router.post("/orders/{order_id}/location")
@router.put("/orders/{order_id}/location")
async def update_order_location(
    order_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    payload: dict = Body(...),
):
    """
    Stream live courier GPS coordinates for an active order.
    Updates 60-second coordinate cache and evaluates 200m hostel proximity.
    """
    logger.info("delivery.location.stream request received order=%s", order_id)
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    heading = payload.get("heading")
    speed = payload.get("speed")

    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=400,
            detail="Latitude and Longitude are required.",
        )

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Latitude and Longitude must be valid numbers.",
        )

    order = await get_order_by_id(order_id)
    dest_lat = None
    dest_lon = None
    hostel_block = None

    if order:
        dest_lat = order.get("latitude")
        dest_lon = order.get("longitude")
        hostel_block = order.get("hostel_block")

    result = await update_courier_location_service(
        order_id=order_id,
        latitude=lat,
        longitude=lon,
        heading=float(heading) if heading is not None else None,
        speed=float(speed) if speed is not None else None,
        destination_lat=dest_lat,
        destination_lon=dest_lon,
        hostel_block=hostel_block,
    )

    logger.info(
        "delivery.location.stream updated order=%s dist=%.1fm is_within_200m=%s",
        order_id,
        result.get("distance_meters", 0.0),
        result.get("is_within_200m", False),
    )

    return {
        "success": True,
        "message": "Delivery location updated",
        "data": result,
        "is_within_200m": result["is_within_200m"],
        "distance_meters": result["distance_meters"],
    }


@router.get("/orders/{order_id}/location")
@router.get("/orders/{order_id}/courier-location")
async def get_order_courier_location(
    order_id: str,
    current_user: Annotated[
        dict,
        Depends(
            require_roles(
                CUSTOMER,
                RESTAURANT_OWNER,
                DELIVERY_PARTNER,
                ADMIN,
            )
        ),
    ],
):
    """
    Get the latest live courier coordinates, distance, and 200m proximity status.
    """
    result = await get_courier_location_and_proximity(order_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Order or location not found",
        )
    return result


@router.get("/roster/slots")
async def get_roster_slots(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    shift_date: str | None = None,
):
    """
    Returns available Mess Wave Shift Roster slots for today/tomorrow.
    """
    from app.services.courier_roster_service import get_available_shift_slots
    phone = current_user.get("phone") or ""
    slots = await get_available_shift_slots(courier_phone=phone, target_date=shift_date)
    return {"items": slots, "shift_date": shift_date}


@router.post("/roster/reserve")
async def reserve_roster_slot(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
    payload: dict = Body(...),
):
    """
    Reserves a lunch (1:00 PM) or dinner (8:30 PM) hostel lobby shift run up to 24h ahead.
    """
    from app.services.courier_roster_service import reserve_courier_shift
    wave_slot_id = payload.get("wave_slot_id")
    if not wave_slot_id:
        raise HTTPException(status_code=400, detail="wave_slot_id is required")

    courier_phone = current_user.get("phone") or payload.get("courier_phone") or ""
    if not courier_phone:
        raise HTTPException(status_code=400, detail="Courier phone is required")

    courier_id = str(current_user.get("_id") or current_user.get("email") or courier_phone)
    courier_name = current_user.get("name") or current_user.get("full_name") or f"Rider {courier_phone[-4:]}"
    shift_date = payload.get("shift_date")
    hostel_block = payload.get("hostel_block")

    try:
        res = await reserve_courier_shift(
            courier_id=courier_id,
            courier_phone=courier_phone,
            courier_name=courier_name,
            wave_slot_id=wave_slot_id,
            shift_date=shift_date,
            hostel_block=hostel_block,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/roster/my")
async def get_my_roster_reservations(
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    """
    Returns confirmed and checked-in shift reservations for the active delivery partner.
    """
    from app.services.courier_roster_service import get_my_shift_reservations
    phone = current_user.get("phone") or ""
    reservations = await get_my_shift_reservations(courier_phone=phone)
    return {"items": reservations}


@router.post("/roster/{reservation_id}/cancel")
async def cancel_roster_reservation(
    reservation_id: str,
    current_user: Annotated[
        dict, Depends(require_roles(DELIVERY_PARTNER, ADMIN))
    ],
):
    """
    Releases a confirmed shift reservation.
    """
    from app.services.courier_roster_service import cancel_shift_reservation
    phone = current_user.get("phone") or ""
    success = await cancel_shift_reservation(reservation_id=reservation_id, courier_phone=phone)
    if not success:
        raise HTTPException(status_code=400, detail="Unable to cancel reservation or not found")
    return {"success": True, "message": "Shift reservation released successfully"}


@router.post("/roster/t20-dispatch-check")
async def trigger_t20_dispatch_check(
    _: Annotated[dict, Depends(require_roles(ADMIN, DELIVERY_PARTNER))],
    payload: dict = Body(default={}),
):
    """
    Evaluates shift roster reservations T-20 minutes before wave starts:
    - If reserved courier is offline, release reservation and flag batch as 'is_priority_mess_batch: True'
    - If courier is online, mark 'CHECKED_IN'
    """
    from app.services.courier_roster_service import check_and_execute_t20_roster_dispatch
    shift_date = payload.get("shift_date")
    wave_slot_id = payload.get("wave_slot_id")
    result = await check_and_execute_t20_roster_dispatch(
        shift_date=shift_date,
        wave_slot_id=wave_slot_id,
    )
    return result


@router.post("/roster/dispatch-mess-batch")
async def trigger_clustered_mess_batch_dispatch(
    _: Annotated[dict, Depends(require_roles(ADMIN, RESTAURANT_OWNER, DELIVERY_PARTNER))],
    payload: dict = Body(...),
):
    """
    Clusters weekly subscriber orders for (restaurant_email, hostel_block) into a single batch paying ₹20 base + ₹10 add-on.
    """
    from app.services.courier_roster_service import dispatch_clustered_mess_batch
    restaurant_email = payload.get("restaurant_email")
    hostel_block = payload.get("hostel_block")
    if not restaurant_email or not hostel_block:
        raise HTTPException(status_code=400, detail="restaurant_email and hostel_block are required")

    result = await dispatch_clustered_mess_batch(
        restaurant_email=restaurant_email,
        hostel_block=hostel_block,
        shift_date=payload.get("shift_date"),
        wave_slot_id=payload.get("wave_slot_id", "LUNCH_WAVE_1"),
        assigned_courier_phone=payload.get("assigned_courier_phone"),
    )
    return result
