import math
from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.db.database import database

logger = get_logger(__name__)

EARTH_RADIUS_METERS = 6371000.0  # WGS84 standard Earth radius in meters
PROXIMITY_THRESHOLD_METERS = 200.0  # 200 meters proximity alert threshold
LOCATION_CACHE_TTL_SECONDS = 60.0  # 60s cache TTL for live GPS coordinate stream

# Campus default hostel coordinate fallback
DEFAULT_CAMPUS_LAT = 18.52043
DEFAULT_CAMPUS_LON = 73.856743

# Common campus hostel block benchmark coordinates
HOSTEL_COORDINATES: dict[str, tuple[float, float]] = {
    "Block A": (18.52043, 73.856743),
    "Block B": (18.52110, 73.857200),
    "Block C": (18.51980, 73.856100),
    "Block D": (18.52200, 73.858000),
    "Girls Hostel 1": (18.52090, 73.855900),
    "Girls Hostel 2": (18.52150, 73.855500),
    "Boys Hostel 1": (18.51950, 73.857500),
    "Boys Hostel 2": (18.51910, 73.858100),
    "Hostel 1": (18.52043, 73.856743),
    "Hostel 2": (18.52110, 73.857200),
    "Hostel 3": (18.51980, 73.856100),
    "Main Hostel": (18.52043, 73.856743),
}

# In-memory coordinate cache: order_id -> dict with 60s TTL
_courier_location_cache: dict[str, dict[str, Any]] = {}


def clear_location_cache():
    """Clear in-memory cache (primarily for tests)."""
    _courier_location_cache.clear()


def haversine_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculates the great-circle distance between two points on the Earth
    surface using the Haversine formula.
    Returns straight-line distance in meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def store_courier_location(
    order_id: str,
    latitude: float,
    longitude: float,
    heading: float | None = None,
    speed: float | None = None,
) -> dict[str, Any]:
    """Store the latest courier coordinates in memory cache with timestamp."""
    now = datetime.now(UTC)
    entry = {
        "order_id": str(order_id),
        "latitude": float(latitude),
        "longitude": float(longitude),
        "heading": float(heading) if heading is not None else None,
        "speed": float(speed) if speed is not None else None,
        "updated_at": now,
    }
    _courier_location_cache[str(order_id)] = entry
    return entry


def get_cached_courier_location(
    order_id: str,
    max_age_seconds: float = LOCATION_CACHE_TTL_SECONDS,
) -> dict[str, Any] | None:
    """
    Retrieve cached courier location for an order.
    Returns None if missing or older than max_age_seconds.
    """
    entry = _courier_location_cache.get(str(order_id))
    if not entry:
        return None
    age = (datetime.now(UTC) - entry["updated_at"]).total_seconds()
    if age > max_age_seconds:
        return None
    return entry


def calculate_order_proximity(
    order_id: str,
    courier_lat: float,
    courier_lon: float,
    destination_lat: float | None = None,
    destination_lon: float | None = None,
    hostel_block: str | None = None,
) -> dict[str, Any]:
    """
    Calculates distance in meters between courier GPS and order dropoff hostel.
    Flags is_within_200m when distance <= 200m.
    """
    dest_lat = destination_lat
    dest_lon = destination_lon

    if dest_lat is None or dest_lon is None:
        if hostel_block and hostel_block in HOSTEL_COORDINATES:
            dest_lat, dest_lon = HOSTEL_COORDINATES[hostel_block]
        else:
            dest_lat = DEFAULT_CAMPUS_LAT
            dest_lon = DEFAULT_CAMPUS_LON

    distance = haversine_distance_meters(
        courier_lat,
        courier_lon,
        dest_lat,
        dest_lon,
    )
    is_within_200m = distance <= PROXIMITY_THRESHOLD_METERS

    return {
        "order_id": str(order_id),
        "courier_latitude": courier_lat,
        "courier_longitude": courier_lon,
        "destination_latitude": dest_lat,
        "destination_longitude": dest_lon,
        "distance_meters": round(distance, 1),
        "is_within_200m": is_within_200m,
        "threshold_meters": PROXIMITY_THRESHOLD_METERS,
    }


async def update_courier_location_service(
    order_id: str,
    latitude: float,
    longitude: float,
    heading: float | None = None,
    speed: float | None = None,
    destination_lat: float | None = None,
    destination_lon: float | None = None,
    hostel_block: str | None = None,
) -> dict[str, Any]:
    """
    Updates in-memory cache and persists location update to MongoDB order collection.
    Returns proximity calculation result.
    """
    cached_entry = store_courier_location(
        order_id=order_id,
        latitude=latitude,
        longitude=longitude,
        heading=heading,
        speed=speed,
    )

    # Calculate proximity
    proximity = calculate_order_proximity(
        order_id=order_id,
        courier_lat=latitude,
        courier_lon=longitude,
        destination_lat=destination_lat,
        destination_lon=destination_lon,
        hostel_block=hostel_block,
    )

    # Asynchronously update DB order record if exists
    try:
        from bson import ObjectId
        query = {"_id": ObjectId(order_id)} if ObjectId.is_valid(order_id) else {"_id": order_id}
        await database["orders"].update_one(
            query,
            {
                "$set": {
                    "delivery_partner.latitude": latitude,
                    "delivery_partner.longitude": longitude,
                    "delivery_partner.heading": heading,
                    "delivery_partner.speed": speed,
                    "delivery_partner.is_within_200m": proximity["is_within_200m"],
                    "delivery_partner.distance_meters": proximity["distance_meters"],
                },
                "$currentDate": {
                    "delivery_partner.last_location_update": True,
                },
            },
        )
    except Exception as exc:
        logger.warning("Failed to persist courier location to DB order=%s error=%s", order_id, exc)

    return {
        **cached_entry,
        **proximity,
        "updated_at": cached_entry["updated_at"].isoformat(),
    }


async def get_courier_location_and_proximity(
    order_id: str,
    order_doc: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """
    Retrieves latest courier coordinates (from 60s cache or DB fallback),
    calculates distance to destination, and returns proximity status.
    """
    # 1. Try cache first
    cached = get_cached_courier_location(order_id)
    courier_lat: float | None = None
    courier_lon: float | None = None
    heading: float | None = None
    speed: float | None = None
    updated_at_str: str | None = None

    if cached:
        courier_lat = cached["latitude"]
        courier_lon = cached["longitude"]
        heading = cached.get("heading")
        speed = cached.get("speed")
        updated_at_str = cached["updated_at"].isoformat()

    # 2. If order_doc not passed, fetch from DB
    if not order_doc:
        from app.models.order import get_order_by_id
        order_doc = await get_order_by_id(order_id)

    if not order_doc:
        if not cached:
            return None
        order_doc = {}

    partner = order_doc.get("delivery_partner") or {}

    # Fallback to DB coordinates if cache miss
    if courier_lat is None or courier_lon is None:
        courier_lat = partner.get("latitude")
        courier_lon = partner.get("longitude")
        heading = partner.get("heading")
        speed = partner.get("speed")
        last_update = partner.get("last_location_update")
        if isinstance(last_update, datetime):
            updated_at_str = last_update.isoformat()
        elif last_update:
            updated_at_str = str(last_update)

    if courier_lat is None or courier_lon is None:
        return {
            "order_id": str(order_id),
            "status": order_doc.get("status"),
            "latitude": None,
            "longitude": None,
            "heading": None,
            "speed": None,
            "updated_at": None,
            "distance_meters": None,
            "is_within_200m": False,
            "hostel_block": order_doc.get("hostel_block"),
        }

    dest_lat = order_doc.get("latitude")
    dest_lon = order_doc.get("longitude")
    hostel_block = order_doc.get("hostel_block")

    proximity = calculate_order_proximity(
        order_id=order_id,
        courier_lat=courier_lat,
        courier_lon=courier_lon,
        destination_lat=dest_lat,
        destination_lon=dest_lon,
        hostel_block=hostel_block,
    )

    return {
        "order_id": str(order_id),
        "status": order_doc.get("status"),
        "latitude": courier_lat,
        "longitude": courier_lon,
        "heading": heading,
        "speed": speed,
        "updated_at": updated_at_str,
        "distance_meters": proximity["distance_meters"],
        "is_within_200m": proximity["is_within_200m"],
        "hostel_block": hostel_block or "Hostel Block",
        "destination_latitude": proximity["destination_latitude"],
        "destination_longitude": proximity["destination_longitude"],
    }
