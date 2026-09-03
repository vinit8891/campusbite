"""Unit tests for Customer profile retrieval, update, password change, and self-deletion."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest
from fastapi import HTTPException

from app.routes.users import (
    get_my_profile,
    update_my_profile,
    change_password,
    delete_my_account,
    UpdateProfilePayload,
    ChangePasswordPayload,
)
from app.auth.security import hash_password


@pytest.mark.asyncio
async def test_get_my_profile_returns_dynamic_order_count():
    user_id = str(ObjectId())
    mock_user = {
        "_id": ObjectId(user_id),
        "name": "Rohan Gupta",
        "email": "rohan@campus.in",
        "phone": "+919876543210",
        "default_hostel_block": "Hostel Block B",
        "default_room": "Room 204",
        "default_instructions": "Leave at security",
        "notification_preferences": {
            "whatsapp_updates": True,
            "sms_alerts": True,
            "promo_offers": True,
        },
    }

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=mock_user)

    mock_orders = AsyncMock()
    mock_orders.count_documents = AsyncMock(return_value=12)

    mock_db = {"users": mock_users, "orders": mock_orders}
    current_user = {"sub": user_id, "email": "rohan@campus.in", "role": "customer"}

    with patch("app.routes.users.database", mock_db):
        profile = await get_my_profile(current_user)
        assert profile["name"] == "Rohan Gupta"
        assert profile["order_count"] == 12
        assert profile["default_hostel_block"] == "Hostel Block B"
        assert profile["default_room"] == "Room 204"
        assert profile["notification_preferences"]["whatsapp_updates"] is True


@pytest.mark.asyncio
async def test_update_my_profile_saves_campus_delivery_settings():
    user_id = str(ObjectId())
    mock_users = AsyncMock()
    mock_users.update_one = AsyncMock(return_value=AsyncMock(matched_count=1))

    mock_db = {"users": mock_users}
    current_user = {"sub": user_id, "email": "rohan@campus.in", "role": "customer"}

    payload = UpdateProfilePayload(
        name="Rohan G.",
        default_hostel_block="Hostel Block C",
        default_room="Room 501",
        default_instructions="Call when downstairs",
    )

    with patch("app.routes.users.database", mock_db):
        res = await update_my_profile(payload, current_user)
        assert res["success"] is True
        mock_users.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_change_password_validates_current_password():
    user_id = str(ObjectId())
    old_hash = hash_password("OldPassword123")
    mock_user = {
        "_id": ObjectId(user_id),
        "email": "rohan@campus.in",
        "password": old_hash,
    }

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=mock_user)
    mock_users.update_one = AsyncMock(return_value=AsyncMock(matched_count=1))

    mock_db = {"users": mock_users}
    current_user = {"sub": user_id, "email": "rohan@campus.in", "role": "customer"}

    # Incorrect old password
    with patch("app.routes.users.database", mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await change_password(
                ChangePasswordPayload(
                    current_password="WrongPassword",
                    new_password="NewSecurePassword123",
                ),
                current_user,
            )
        assert exc_info.value.status_code == 400
        assert "current password is incorrect" in exc_info.value.detail.lower()

    # Correct old password
    with patch("app.routes.users.database", mock_db):
        res = await change_password(
            ChangePasswordPayload(
                current_password="OldPassword123",
                new_password="NewSecurePassword123",
            ),
            current_user,
        )
        assert res["success"] is True
        mock_users.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_delete_my_account_with_active_orders_rejected():
    user_id = str(ObjectId())
    mock_user = {
        "_id": ObjectId(user_id),
        "email": "rohan@campus.in",
        "phone": "+919876543210",
    }

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=mock_user)

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value={"_id": ObjectId(), "status": "Out for Delivery"})

    mock_db = {"users": mock_users, "orders": mock_orders}
    current_user = {"sub": user_id, "email": "rohan@campus.in", "phone": "+919876543210", "role": "customer"}

    with patch("app.routes.users.database", mock_db):
        with pytest.raises(HTTPException) as exc_info:
            await delete_my_account(current_user)
        assert exc_info.value.status_code == 400
        assert "active unfulfilled orders" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_delete_my_account_success():
    user_id = str(ObjectId())
    mock_user = {
        "_id": ObjectId(user_id),
        "email": "rohan@campus.in",
        "phone": "+919876543210",
    }

    mock_users = AsyncMock()
    mock_users.find_one = AsyncMock(return_value=mock_user)
    mock_users.delete_one = AsyncMock(return_value=AsyncMock(deleted_count=1))

    mock_orders = AsyncMock()
    mock_orders.find_one = AsyncMock(return_value=None)

    mock_db = {"users": mock_users, "orders": mock_orders}
    current_user = {"sub": user_id, "email": "rohan@campus.in", "phone": "+919876543210", "role": "customer"}

    with patch("app.routes.users.database", mock_db):
        res = await delete_my_account(current_user)
        assert res["success"] is True
        mock_users.delete_one.assert_called_once()
