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
