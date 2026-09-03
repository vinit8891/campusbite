"""Unit tests for Admin user deletion across Customers, Owners, and Delivery Partners."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest
from fastapi import HTTPException

from app.routers.admin import delete_user


@pytest.mark.asyncio
async def test_admin_delete_customer_success():
    """Admin can delete a customer with no active unfulfilled orders."""
    user_id = str(ObjectId())
    mock_customer = {
        "_id": ObjectId(user_id),
        "name": "John Doe",
        "email": "john@campus.in",
        "phone": "+919876543210",
    }

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=mock_customer)
    mock_users.delete_one = AsyncMock(return_value=AsyncMock(deleted_count=1))

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value=None)  # No active orders

    mock_db = {
        "users": mock_users,
        "orders": mock_orders,
        "restaurant_owners": AsyncMock(),
        "delivery_partners": AsyncMock(),
        "restaurants": AsyncMock(),
        "menu": AsyncMock(),
        "admin_audit_logs": AsyncMock(),
    }

    current_admin = {"id": "admin_123", "email": "admin@campusbite.in", "role": "admin"}

    with patch("app.routers.admin.database", mock_db), patch("app.routers.admin.log_admin_action", AsyncMock()):
        result = await delete_user(user_id, current_admin, role="customers")
        assert result["success"] is True
        assert "deleted successfully" in result["message"].lower()
        mock_users.delete_one.assert_called_once()


@pytest.mark.asyncio
async def test_admin_delete_self_prevention():
    """Admin cannot delete their own account."""
    admin_id = str(ObjectId())
    mock_admin_user = {
        "_id": ObjectId(admin_id),
        "name": "Super Admin",
        "email": "admin@campusbite.in",
    }

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=mock_admin_user)

    mock_db = {
        "users": mock_users,
        "restaurant_owners": AsyncMock(),
        "delivery_partners": AsyncMock(),
    }

    current_admin = {"id": admin_id, "email": "admin@campusbite.in", "role": "admin"}

    with patch("app.routers.admin.database", mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await delete_user(admin_id, current_admin, role="customers")
        assert exc_info.value.status_code == 400
        assert "currently logged-in admin" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_admin_delete_restaurant_owner_with_active_orders_rejected():
    """Cannot delete a restaurant owner who has active unfulfilled orders."""
    owner_id = str(ObjectId())
    mock_owner = {
        "_id": ObjectId(owner_id),
        "name": "Chef Mario",
        "email": "mario@pizza.in",
    }

    mock_owners = AsyncMock()
    mock_owners.find_one = AsyncMock(return_value=mock_owner)

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value={"_id": ObjectId(), "status": "Preparing"})

    mock_db = {
        "restaurant_owners": mock_owners,
        "orders": mock_orders,
        "users": AsyncMock(),
        "delivery_partners": AsyncMock(),
    }

    current_admin = {"id": "admin_123", "email": "admin@campusbite.in", "role": "admin"}

    with patch("app.routers.admin.database", mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await delete_user(owner_id, current_admin, role="restaurant-owners")
        assert exc_info.value.status_code == 400
        assert "active unfulfilled orders" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_admin_delete_restaurant_owner_cascade_success():
    """Deleting restaurant owner also cleans up restaurant and menu entries."""
    owner_id = str(ObjectId())
    owner_email = "mario@pizza.in"
    mock_owner = {
        "_id": ObjectId(owner_id),
        "name": "Chef Mario",
        "email": owner_email,
    }

    mock_owners = AsyncMock()
    mock_owners.find_one = AsyncMock(return_value=mock_owner)
    mock_owners.delete_one = AsyncMock(return_value=AsyncMock(deleted_count=1))

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value=None)

    mock_restaurants = AsyncMock()
    mock_menu = AsyncMock()

    mock_db = {
        "restaurant_owners": mock_owners,
        "orders": mock_orders,
        "restaurants": mock_restaurants,
        "menu": mock_menu,
        "users": AsyncMock(),
        "delivery_partners": AsyncMock(),
        "admin_audit_logs": AsyncMock(),
    }

    current_admin = {"id": "admin_123", "email": "admin@campusbite.in", "role": "admin"}

    with patch("app.routers.admin.database", mock_db), patch("app.routers.admin.log_admin_action", AsyncMock()):
        result = await delete_user(owner_id, current_admin, role="restaurant-owners")
        assert result["success"] is True
        mock_owners.delete_one.assert_called_once()
        mock_restaurants.delete_many.assert_called_once_with({"email": owner_email})
        mock_menu.delete_many.assert_called_once_with({"restaurant_email": owner_email})


@pytest.mark.asyncio
async def test_admin_delete_nonexistent_user_returns_404():
    """Returns 404 when user ID is not found in database."""
    random_id = str(ObjectId())
    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=None)
    mock_owners = AsyncMock()
    mock_owners.find_one = AsyncMock(return_value=None)
    mock_partners = AsyncMock()
    mock_partners.find_one = AsyncMock(return_value=None)

    mock_db = {
        "users": mock_users,
        "restaurant_owners": mock_owners,
        "delivery_partners": mock_partners,
    }

    current_admin = {"id": "admin_123", "email": "admin@campusbite.in", "role": "admin"}

    with patch("app.routers.admin.database", mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await delete_user(random_id, current_admin)
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()
