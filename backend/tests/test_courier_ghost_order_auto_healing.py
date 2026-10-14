"""Unit and integration tests for Courier Ghost Order Auto-Healing and Cascade Unassign."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import create_access_token
from app.auth.roles import DELIVERY_PARTNER, ADMIN


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def courier_headers():
    token = create_access_token(
        data={
            "sub": "courier_123",
            "phone": "+919876543210",
            "name": "Rider Ramesh",
            "role": DELIVERY_PARTNER,
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token(
        data={
            "sub": "admin_123",
            "email": "admin@campusbite.com",
            "name": "Super Admin",
            "role": ADMIN,
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_active_run_auto_heals_when_order_deleted_from_db(client, courier_headers):
    """When courier document references an order that is missing in orders collection,
    GET /delivery-dashboard/active-run unsets current_order_id and returns idle run."""
    fake_order_id = str(ObjectId())
    fake_courier = {
        "_id": ObjectId(),
        "phone": "+919876543210",
        "name": "Rider Ramesh",
        "current_order_id": fake_order_id,
        "active_run": fake_order_id,
    }

    mock_couriers = AsyncMock()
    mock_couriers.find_one = AsyncMock(return_value=fake_courier)
    mock_couriers.update_many = AsyncMock(return_value=AsyncMock(modified_count=1))

    mock_partners = AsyncMock()
    mock_partners.find_one = AsyncMock(return_value=fake_courier)
    mock_partners.update_many = AsyncMock(return_value=AsyncMock(modified_count=1))

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=None)
    mock_users.update_many = AsyncMock(return_value=AsyncMock(modified_count=0))

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value=None)  # Order does not exist (deleted by admin)

    db_mock = {
        "couriers": mock_couriers,
        "delivery_partners": mock_partners,
        "users": mock_users,
        "orders": mock_orders,
    }

    with patch("app.routes.delivery_dashboard.database", db_mock), \
         patch("app.routes.delivery_dashboard.orders", mock_orders):
        res = client.get("/delivery-dashboard/active-run", headers=courier_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["active_run"] is None
    assert data["orders"] == []
    assert data["status"] == "idle"

    # Verify update_many unset was triggered
    mock_couriers.update_many.assert_called()


@pytest.mark.asyncio
async def test_active_run_auto_heals_when_order_cancelled_or_delivered(client, courier_headers):
    """When courier document references an order whose status is CANCELLED or DELIVERED,
    it automatically unsets courier document fields and returns idle run."""
    existing_order_id = str(ObjectId())
    fake_courier = {
        "_id": ObjectId(),
        "phone": "+919876543210",
        "name": "Rider Ramesh",
        "current_order_id": existing_order_id,
    }
    cancelled_order = {
        "_id": ObjectId(existing_order_id),
        "status": "CANCELLED",
        "customer_name": "Student",
    }

    mock_couriers = AsyncMock()
    mock_couriers.find_one = AsyncMock(return_value=fake_courier)
    mock_couriers.update_many = AsyncMock()

    mock_partners = AsyncMock()
    mock_partners.find_one = AsyncMock(return_value=fake_courier)
    mock_partners.update_many = AsyncMock()

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=None)
    mock_users.update_many = AsyncMock()

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value=cancelled_order)

    db_mock = {
        "couriers": mock_couriers,
        "delivery_partners": mock_partners,
        "users": mock_users,
        "orders": mock_orders,
    }

    with patch("app.routes.delivery_dashboard.database", db_mock), \
         patch("app.routes.delivery_dashboard.orders", mock_orders):
        res = client.get("/delivery-dashboard/active-run", headers=courier_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["active_run"] is None
    assert data["orders"] == []
    assert data["status"] == "idle"
    mock_couriers.update_many.assert_called()


@pytest.mark.asyncio
async def test_admin_delete_order_cascade_unassigns_couriers(client, admin_headers):
    """When admin deletes an order, couriers with current_order_id equal to order_id are unassigned."""
    order_id = str(ObjectId())
    order_doc = {
        "_id": ObjectId(order_id),
        "id": order_id,
        "customer_name": "Student A",
        "delivery_partner": {"phone": "+919876543210"},
        "status": "Assigned",
    }

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value=order_doc)
    mock_orders.delete_one = AsyncMock(return_value=AsyncMock(deleted_count=1))

    mock_couriers = AsyncMock()
    mock_couriers.update_many = AsyncMock(return_value=AsyncMock(modified_count=1))

    mock_partners = AsyncMock()
    mock_partners.update_many = AsyncMock(return_value=AsyncMock(modified_count=1))

    mock_users = AsyncMock()
    mock_users.update_many = AsyncMock(return_value=AsyncMock(modified_count=0))

    db_mock = {
        "orders": mock_orders,
        "couriers": mock_couriers,
        "delivery_partners": mock_partners,
        "users": mock_users,
        "admin_audit_logs": AsyncMock(),
    }

    with patch("app.routers.admin.database", db_mock), \
         patch("app.routers.admin.log_admin_action", new_callable=AsyncMock):
        res = client.delete(f"/admin/orders/{order_id}", headers=admin_headers)

    assert res.status_code == 200
    assert res.json()["success"] is True
    mock_orders.delete_one.assert_called_once()
    mock_couriers.update_many.assert_called()
    mock_partners.update_many.assert_called()
