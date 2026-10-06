"""Unit and integration tests for Live Courier GPS Location Streaming and 200m Hostel Proximity Alerts."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import create_access_token
from app.auth.roles import CUSTOMER, DELIVERY_PARTNER, ADMIN
from app.services.location_service import (
    haversine_distance_meters,
    store_courier_location,
    get_cached_courier_location,
    calculate_order_proximity,
    clear_location_cache,
    EARTH_RADIUS_METERS,
    PROXIMITY_THRESHOLD_METERS,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def delivery_partner_headers():
    token = create_access_token(
        data={
            "sub": "dp_user_1",
            "phone": "+919876543210",
            "name": "Rider Ramesh",
            "role": DELIVERY_PARTNER,
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_headers():
    token = create_access_token(
        data={
            "sub": "cust_user_1",
            "phone": "+919123456780",
            "email": "student@campus.edu",
            "name": "Aarav Student",
            "role": CUSTOMER,
        }
    )
    return {"Authorization": f"Bearer {token}"}


def test_haversine_distance_calculation():
    """Haversine formula calculates straight-line distance in meters accurately."""
    # 1. Zero distance (same point)
    lat1, lon1 = 18.52043, 73.856743
    d0 = haversine_distance_meters(lat1, lon1, lat1, lon1)
    assert round(d0, 2) == 0.0

    # 2. Known benchmark distance (~128m in campus)
    lat2, lon2 = 18.52150, 73.857200
    d1 = haversine_distance_meters(lat1, lon1, lat2, lon2)
    assert 100.0 < d1 < 160.0

    # 3. Longer campus distance (~1.5km)
    lat3, lon3 = 18.53000, 73.865000
    d2 = haversine_distance_meters(lat1, lon1, lat3, lon3)
    assert 1200.0 < d2 < 2000.0


def test_location_cache_storage_and_60s_ttl():
    """In-memory coordinate cache stores coordinates and enforces 60s TTL."""
    clear_location_cache()
    order_id = "test_order_ttl_1"

    # Store entry
    entry = store_courier_location(
        order_id=order_id,
        latitude=18.52043,
        longitude=73.856743,
        heading=120.5,
        speed=4.2,
    )
    assert entry["latitude"] == 18.52043
    assert entry["heading"] == 120.5
    assert entry["speed"] == 4.2

    # Retrieve fresh cache (< 60s)
    cached = get_cached_courier_location(order_id)
    assert cached is not None
    assert cached["latitude"] == 18.52043

    # Simulate expired entry (> 60s)
    expired_time = datetime.now(UTC) - timedelta(seconds=65)
    entry["updated_at"] = expired_time

    stale = get_cached_courier_location(order_id)
    assert stale is None


def test_proximity_evaluation_200m():
    """calculate_order_proximity evaluates straight-line distance and sets is_within_200m flag."""
    dest_lat, dest_lon = 18.52043, 73.856743

    # Scenario A: Rider is 100m away (Within 200m)
    rider_lat_near = 18.52100
    rider_lon_near = 73.85700
    prox_near = calculate_order_proximity(
        order_id="order_near",
        courier_lat=rider_lat_near,
        courier_lon=rider_lon_near,
        destination_lat=dest_lat,
        destination_lon=dest_lon,
    )
    assert prox_near["is_within_200m"] is True
    assert prox_near["distance_meters"] <= 200.0

    # Scenario B: Rider is 500m away (Outside 200m)
    rider_lat_far = 18.52500
    rider_lon_far = 73.86000
    prox_far = calculate_order_proximity(
        order_id="order_far",
        courier_lat=rider_lat_far,
        courier_lon=rider_lon_far,
        destination_lat=dest_lat,
        destination_lon=dest_lon,
    )
    assert prox_far["is_within_200m"] is False
    assert prox_far["distance_meters"] > 200.0


def test_post_courier_location_updates_stream(client, delivery_partner_headers):
    """POST /delivery/orders/{order_id}/location streams GPS coordinates and calculates proximity."""
    fake_oid = str(ObjectId())
    mock_order = {
        "_id": ObjectId(fake_oid),
        "status": "Out for Delivery",
        "latitude": 18.52043,
        "longitude": 73.856743,
        "hostel_block": "Block B",
        "delivery_partner": {
            "name": "Rider Ramesh",
            "phone": "+919876543210",
        },
    }

    with patch("app.routes.delivery.get_order_by_id", new_callable=AsyncMock) as mock_get_order:
        mock_get_order.return_value = mock_order
        with patch("app.services.location_service.database") as mock_db:
            mock_db.__getitem__.return_value.update_one = AsyncMock(return_value=None)

            # Rider is near (~80m away)
            res = client.post(
                f"/delivery/orders/{fake_oid}/location",
                headers=delivery_partner_headers,
                json={
                    "latitude": 18.52080,
                    "longitude": 73.85700,
                    "heading": 45.0,
                    "speed": 6.2,
                },
            )

            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["is_within_200m"] is True
            assert data["distance_meters"] <= 200.0


def test_get_courier_location_proximity_endpoint(client, customer_headers):
    """GET /orders/{order_id}/courier-location returns live coordinates and proximity alert."""
    fake_oid = str(ObjectId())
    mock_order = {
        "_id": ObjectId(fake_oid),
        "customer_id": "cust_user_1",
        "customer_email": "student@campus.edu",
        "phone": "+919123456780",
        "status": "Out for Delivery",
        "latitude": 18.52043,
        "longitude": 73.856743,
        "hostel_block": "Block B",
        "delivery_partner": {
            "name": "Rider Ramesh",
            "phone": "+919876543210",
            "latitude": 18.52090,
            "longitude": 73.85710,
        },
    }

    with patch("app.routes.order.get_order_by_id", new_callable=AsyncMock) as mock_get_order:
        mock_get_order.return_value = mock_order

        res = client.get(
            f"/orders/{fake_oid}/courier-location",
            headers=customer_headers,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["is_within_200m"] is True
        assert data["distance_meters"] <= 200.0
        assert data["status"] == "Out for Delivery"
