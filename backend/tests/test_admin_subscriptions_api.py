"""Unit tests for Admin Mess Subscriptions API & Financial Controls."""

from __future__ import annotations

from unittest.mock import AsyncMock
import pytest
from bson import ObjectId
from app.routes.admin_subscription import (
    get_admin_subscriptions,
    update_subscription_payment_status,
    update_subscription_status,
    delete_admin_subscription,
)


class MockCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, *args, **kwargs):
        return self

    async def to_list(self, length=None):
        return self.items


@pytest.mark.asyncio
async def test_get_admin_subscriptions_aggregation_and_stats():
    """Verify GET /admin/subscriptions calculates authoritative stats directly from data."""
    sub_1 = {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "subscription_id": "sub_1",
        "customer_email": "student1@campus.edu",
        "restaurant_name": "Zeal Mess",
        "plan_name": "Weekly Lunch",
        "price": 700.0,
        "payment_status": "paid",
        "status": "active",
        "is_deleted": False,
    }
    sub_2 = {
        "_id": ObjectId("507f1f77bcf86cd799439012"),
        "subscription_id": "sub_2",
        "customer_email": "student2@campus.edu",
        "restaurant_name": "Campus Cafe",
        "plan_name": "Monthly Dinner",
        "price": 2800.0,
        "payment_status": "pending",
        "status": "active",
        "is_deleted": False,
    }
    sub_3 = {
        "_id": ObjectId("507f1f77bcf86cd799439013"),
        "subscription_id": "sub_3",
        "customer_email": "student3@campus.edu",
        "restaurant_name": "Zeal Mess",
        "plan_name": "Monthly Thali",
        "price": 2500.0,
        "payment_status": "paid",
        "status": "cancelled",
        "is_deleted": False,
    }

    mock_db = {
        "subscriptions": AsyncMock(
            find=lambda query: MockCursor([sub_1, sub_2, sub_3])
        )
    }

    res = await get_admin_subscriptions(
        search=None,
        status=None,
        payment_status=None,
        current_user={"role": "admin", "email": "admin@campusbite.com"},
        db=mock_db,
    )

    assert "subscriptions" in res
    assert "stats" in res
    stats = res["stats"]

    # total_revenue: sub_1 (700) + sub_3 (2500) = 3200.0
    assert stats["total_revenue"] == 3200.0
    assert stats["paid_count"] == 2
    assert stats["pending_count"] == 1
    assert stats["active_count"] == 2
    assert stats["total_count"] == 3


@pytest.mark.asyncio
async def test_update_subscription_payment_status_auto_activates():
    """Setting payment_status to 'paid' automatically activates the subscription."""
    sub_doc = {
        "_id": ObjectId("507f1f77bcf86cd799439021"),
        "subscription_id": "sub_pending",
        "customer_email": "cash_user@campus.edu",
        "price": 1000.0,
        "payment_status": "pending",
        "status": "pending_verification",
    }

    updated_doc = dict(sub_doc)

    mock_coll = AsyncMock()
    mock_coll.find_one = AsyncMock(side_effect=lambda q: updated_doc)
    
    async def mock_update_one(filt, update_dict):
        updated_doc.update(update_dict.get("$set", {}))
        return AsyncMock(modified_count=1)

    mock_coll.update_one = AsyncMock(side_effect=mock_update_one)
    mock_db = {"subscriptions": mock_coll}

    res = await update_subscription_payment_status(
        sub_id="sub_pending",
        payload={"payment_status": "paid"},
        current_user={"role": "admin"},
        db=mock_db,
    )

    assert res["success"] is True
    assert updated_doc["payment_status"] == "paid"
    # Verify auto-activation
    assert updated_doc["status"] == "active"


@pytest.mark.asyncio
async def test_update_subscription_status_lifecycle():
    """Admin can update subscription lifecycle status (e.g. cancelled)."""
    sub_doc = {
        "_id": ObjectId("507f1f77bcf86cd799439031"),
        "subscription_id": "sub_active_1",
        "status": "active",
    }
    updated_doc = dict(sub_doc)

    mock_coll = AsyncMock()
    mock_coll.find_one = AsyncMock(side_effect=lambda q: updated_doc)

    async def mock_update_one(filt, update_dict):
        updated_doc.update(update_dict.get("$set", {}))
        return AsyncMock(modified_count=1)

    mock_coll.update_one = AsyncMock(side_effect=mock_update_one)
    mock_db = {"subscriptions": mock_coll}

    res = await update_subscription_status(
        sub_id="sub_active_1",
        payload={"status": "cancelled"},
        current_user={"role": "admin"},
        db=mock_db,
    )

    assert res["success"] is True
    assert updated_doc["status"] == "cancelled"


@pytest.mark.asyncio
async def test_delete_admin_subscription_soft_delete():
    """DELETE /admin/subscriptions/{sub_id} soft-deletes or archives the record."""
    sub_doc = {
        "_id": ObjectId("507f1f77bcf86cd799439041"),
        "subscription_id": "sub_del_1",
        "status": "active",
        "is_deleted": False,
    }
    updated_doc = dict(sub_doc)

    mock_coll = AsyncMock()
    mock_coll.find_one = AsyncMock(side_effect=lambda q: updated_doc)

    async def mock_update_one(filt, update_dict):
        updated_doc.update(update_dict.get("$set", {}))
        return AsyncMock(modified_count=1)

    mock_coll.update_one = AsyncMock(side_effect=mock_update_one)
    mock_db = {"subscriptions": mock_coll}

    res = await delete_admin_subscription(
        sub_id="sub_del_1",
        current_user={"role": "admin"},
        db=mock_db,
    )

    assert res["success"] is True
    assert res["message"] == "Subscription deleted successfully"
    assert updated_doc["is_deleted"] is True
    assert updated_doc["status"] == "cancelled"
