"""Tests for Restaurant Profile Update Schema, Alias Handling, and Route Compatibility."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.roles import ADMIN, RESTAURANT_OWNER
from app.auth.security import create_access_token
from app.schemas.restaurant import RestaurantUpdate


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def owner_token():
    return create_access_token({
        "sub": "owner@canteen.edu",
        "role": RESTAURANT_OWNER,
        "email": "owner@canteen.edu",
    })


@pytest.fixture
def admin_token():
    return create_access_token({
        "sub": "admin@campusbite.com",
        "role": ADMIN,
        "email": "admin@campusbite.com",
    })


def test_restaurant_update_schema_all_optional():
    """Verify every field in RestaurantUpdate is optional with default None."""
    # Empty payload must be valid
    empty = RestaurantUpdate()
    assert empty.model_dump(exclude_unset=True) == {}

    # Partial update with only aliases
    partial = RestaurantUpdate(
        cuisine_type="South Indian",
        opening_time="08:00",
        closing_time="21:00",
        banner_image="https://example.com/banner.jpg",
    )
    dumped = partial.model_dump(exclude_unset=True)
    assert dumped["cuisine_type"] == "South Indian"
    assert dumped["opening_time"] == "08:00"
    assert dumped["closing_time"] == "21:00"
    assert dumped["banner_image"] == "https://example.com/banner.jpg"
    assert "name" not in dumped
    assert "email" not in dumped


@pytest.mark.asyncio
async def test_put_restaurant_partial_update_owner(client, owner_token):
    """Verify PUT /restaurants/{id} accepts partial updates without 422 error."""
    fake_id = str(ObjectId())
    existing_doc = {
        "_id": ObjectId(fake_id),
        "name": "Original Name",
        "email": "owner@canteen.edu",
        "cuisine": "North Indian",
        "image": "https://example.com/old.jpg",
    }

    with patch("app.routes.restaurant.get_restaurant_by_id", new_callable=AsyncMock) as mock_get, \
         patch("app.routes.restaurant.update_restaurant", new_callable=AsyncMock) as mock_update:
        mock_get.return_value = existing_doc
        mock_update.return_value = 1

        payload = {
            "cuisine_type": "South Indian",
            "opening_time": "09:00",
            "banner_image": "https://example.com/new.jpg",
        }

        resp = client.put(
            f"/restaurants/{fake_id}",
            json=payload,
            headers={"Authorization": f"Bearer {owner_token}"},
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "Restaurant updated successfully"
        mock_update.assert_awaited_once()

        updated_data = mock_update.call_args[0][1]
        assert updated_data["cuisine"] == "South Indian"
        assert updated_data["cuisine_type"] == "South Indian"
        assert updated_data["opening_hours"] == "09:00"
        assert updated_data["opening_time"] == "09:00"
        assert updated_data["image"] == "https://example.com/new.jpg"
        assert updated_data["banner_image"] == "https://example.com/new.jpg"


@pytest.mark.asyncio
async def test_put_restaurant_singular_prefix_compatibility(client, owner_token):
    """Verify PUT /restaurant/{id} (singular) works identically to /restaurants/{id}."""
    fake_id = str(ObjectId())
    existing_doc = {
        "_id": ObjectId(fake_id),
        "name": "Hostel 4 Mess",
        "email": "owner@canteen.edu",
        "cuisine": "Thali",
    }

    with patch("app.routes.restaurant.get_restaurant_by_id", new_callable=AsyncMock) as mock_get, \
         patch("app.routes.restaurant.update_restaurant", new_callable=AsyncMock) as mock_update:
        mock_get.return_value = existing_doc
        mock_update.return_value = 1

        payload = {"name": "Hostel 4 Food Hub"}

        resp = client.put(
            f"/restaurant/{fake_id}",
            json=payload,
            headers={"Authorization": f"Bearer {owner_token}"},
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "Restaurant updated successfully"


@pytest.mark.asyncio
async def test_put_restaurant_not_found(client, owner_token):
    """Verify PUT /restaurants/{id} returns 404 when restaurant does not exist."""
    fake_id = str(ObjectId())

    with patch("app.routes.restaurant.get_restaurant_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None

        resp = client.put(
            f"/restaurants/{fake_id}",
            json={"name": "Ghost Canteen"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )

        assert resp.status_code == 404
        assert resp.json()["detail"] == "Restaurant not found"
