"""Unit tests for Order Tracking and Restaurant Location Binding."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import create_access_token
from app.auth.roles import CUSTOMER
from app.schemas.order import RestaurantSnapshot, OrderResponse


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def customer_headers():
    token = create_access_token(
        data={
            "sub": "cust_12345",
            "phone": "+919876543210",
            "email": "customer@campusbite.com",
            "name": "Aarav Student",
            "role": CUSTOMER,
        }
    )
    return {"Authorization": f"Bearer {token}"}


def test_restaurant_snapshot_defaults():
    """Validates RestaurantSnapshot schema defaults."""
    snapshot = RestaurantSnapshot()
    assert snapshot.name == "Zeal Campus Eatery"
    assert snapshot.address == "Zeal College Campus, Narhe"
    assert snapshot.latitude == 18.4485
    assert snapshot.longitude == 73.8242


def test_order_response_schema():
    """Validates OrderResponse serialization with restaurant snapshot."""
    data = {
        "id": "ord_1",
        "restaurant_id": "rest_1",
        "restaurant_name": "Zeal Canteen",
        "restaurant": {
            "name": "Zeal Canteen",
            "address": "Campus Ground",
            "latitude": 18.4485,
            "longitude": 73.8242,
        },
        "restaurant_info": {
            "name": "Zeal Canteen",
            "address": "Campus Ground",
            "latitude": 18.4485,
            "longitude": 73.8242,
        },
        "status": "Preparing",
    }
    resp = OrderResponse(**data)
    assert resp.restaurant is not None
    assert resp.restaurant.name == "Zeal Canteen"
    assert resp.restaurant.latitude == 18.4485
    assert resp.restaurant_info is not None
    assert resp.restaurant_info.name == "Zeal Canteen"


def test_get_order_by_id_populates_restaurant_snapshot(client, customer_headers):
    """GET /orders/{order_id} queries and serializes the restaurant document snapshot."""
    fake_order_id = str(ObjectId())
    fake_rest_id = str(ObjectId())

    fake_order = {
        "_id": ObjectId(fake_order_id),
        "id": fake_order_id,
        "customer_phone": "+919876543210",
        "phone": "+919876543210",
        "restaurant_id": fake_rest_id,
        "restaurant_email": "canteen@zeal.edu",
        "status": "Preparing",
        "total": 120.0,
        "address": "Hostel Block A, Rm 204",
        "payment_method": "cod",
        "created_at": datetime.now(UTC),
    }

    fake_restaurant = {
        "_id": ObjectId(fake_rest_id),
        "name": "Central Zeal Canteen",
        "address": "Main Building Ground Floor, Narhe",
        "stall_location": "Stall #2",
        "phone": "+919988776655",
        "latitude": 18.4485,
        "longitude": 73.8242,
    }

    with patch("app.routes.order.get_order_by_id", new_callable=AsyncMock) as mock_get_order:
        mock_get_order.return_value = fake_order
        with patch("app.routes.order.database") as mock_db:
            mock_rest_collection = AsyncMock()
            mock_rest_collection.find_one = AsyncMock(return_value=fake_restaurant)
            mock_db.__getitem__.return_value = mock_rest_collection

            res = client.get(f"/orders/{fake_order_id}", headers=customer_headers)

            assert res.status_code == 200
            body = res.json()
            assert body["restaurant_name"] == "Central Zeal Canteen"
            assert "restaurant" in body
            assert body["restaurant"]["name"] == "Central Zeal Canteen"
            assert body["restaurant"]["address"] == "Main Building Ground Floor, Narhe"
            assert body["restaurant"]["phone"] == "+919988776655"
            assert body["restaurant"]["latitude"] == 18.4485
            assert body["restaurant"]["longitude"] == 73.8242

            assert "restaurant_info" in body
            assert body["restaurant_info"]["name"] == "Central Zeal Canteen"
