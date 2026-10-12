"""Tests for authoritative backend order creation, coupon validation, and cash round-off."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import create_access_token
from app.auth.roles import CUSTOMER


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def customer_auth_headers():
    token = create_access_token({
        "sub": "cust_test_123",
        "email": "student@campusbite.in",
        "full_name": "Test Student",
        "phone": "9876543210",
        "role": CUSTOMER,
    })
    return {"Authorization": f"Bearer {token}"}


def test_order_creation_flat_coupon(client, customer_auth_headers):
    """Verifies flat coupon discount application, used_count increment, and order fields."""
    coupon_id = ObjectId()
    mock_coupon = {
        "_id": coupon_id,
        "code": "FLAT20",
        "discount_type": "flat",
        "discount_value": 20.0,
        "min_order_value": 50.0,
        "max_discount": 20.0,
        "is_active": True,
        "used_count": 0,
    }

    # Items subtotal: 60.0
    # GST (5%): 3.0
    # Delivery fee: 15.0
    # Platform fee: 3.0
    # Discount: 20.0
    # Gross total: 60 + 3 + 15 + 3 - 20 = 61.0
    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Test Student",
        "phone": "9876543210",
        "address": "Hostel 1, Room 101",
        "fulfillment_mode": "delivery",
        "delivery_type": "HOSTEL_BATCH",
        "payment_method": "cod",
        "coupon_code": "FLAT20",
        "items": [
            {"id": "item1", "name": "Veg Thali", "price": 60.0, "quantity": 1}
        ],
        "total_amount": 61.0,
    }

    created_oid = str(ObjectId())

    with patch("app.routes.order.database") as mock_db, \
         patch("app.routes.order.create_order", AsyncMock(return_value=created_oid)) as mock_create_order, \
         patch("app.routes.order.schedule_notification", MagicMock()):
        
        mock_db["coupons"].find_one = AsyncMock(return_value=mock_coupon)
        mock_db["coupons"].update_one = AsyncMock()

        resp = client.post("/orders", json=payload, headers=customer_auth_headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["message"] == "Order placed successfully"

        # Verify coupon used_count incremented
        mock_db["coupons"].update_one.assert_awaited_once_with(
            {"_id": coupon_id},
            {"$inc": {"used_count": 1}},
        )

        # Verify persisted order document received correct breakdown
        created_data = mock_create_order.call_args[0][0]
        assert created_data["items_subtotal"] == 60.0
        assert created_data["gst"] == 3.0
        assert created_data["delivery_fee"] == 15.0
        assert created_data["platform_fee"] == 3.0
        assert created_data["discount_amount"] == 20.0
        assert created_data["coupon_code"] == "FLAT20"
        assert created_data["total_amount"] == 61.0


def test_order_creation_percentage_coupon_with_max_discount(client, customer_auth_headers):
    """Verifies percentage coupon capped at max_discount."""
    coupon_id = ObjectId()
    mock_coupon = {
        "_id": coupon_id,
        "code": "SUPER50",
        "discount_type": "percent",
        "discount_value": 50.0,  # 50% of 100 = 50.0
        "min_order_value": 50.0,
        "max_discount": 30.0,   # Capped at 30.0
        "is_active": True,
        "used_count": 5,
    }

    # Items subtotal: 100.0
    # GST (5%): 5.0
    # Delivery fee: 15.0
    # Platform fee: 3.0
    # Discount: 30.0 (capped)
    # Gross total: 100 + 5 + 15 + 3 - 30 = 93.0
    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Test Student",
        "phone": "9876543210",
        "address": "Hostel 1, Room 101",
        "fulfillment_mode": "delivery",
        "payment_method": "cod",
        "coupon_code": "super50",
        "items": [
            {"id": "item1", "name": "Biryani", "price": 100.0, "quantity": 1}
        ],
        "total_amount": 93.0,
    }

    created_oid = str(ObjectId())

    with patch("app.routes.order.database") as mock_db, \
         patch("app.routes.order.create_order", AsyncMock(return_value=created_oid)) as mock_create_order, \
         patch("app.routes.order.schedule_notification", MagicMock()):
        
        mock_db["coupons"].find_one = AsyncMock(return_value=mock_coupon)
        mock_db["coupons"].update_one = AsyncMock()

        resp = client.post("/orders", json=payload, headers=customer_auth_headers)
        assert resp.status_code == 200, resp.text

        created_data = mock_create_order.call_args[0][0]
        assert created_data["discount_amount"] == 30.0
        assert created_data["total_amount"] == 93.0


def test_order_creation_coupon_below_min_order_value_ignored(client, customer_auth_headers):
    """Verifies that coupon is ignored if subtotal is below min_order_value."""
    mock_coupon = {
        "_id": ObjectId(),
        "code": "SAVE20",
        "discount_type": "flat",
        "discount_value": 20.0,
        "min_order_value": 100.0,  # Requires ₹100
        "is_active": True,
        "used_count": 0,
    }

    # Items subtotal: 40.0 (< 100)
    # GST: 2.0
    # Delivery fee: 15.0
    # Platform fee: 3.0
    # Discount: 0.0
    # Gross total: 40 + 2 + 15 + 3 = 60.0
    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Test Student",
        "phone": "9876543210",
        "address": "Hostel 1, Room 101",
        "fulfillment_mode": "delivery",
        "payment_method": "cod",
        "coupon_code": "SAVE20",
        "items": [
            {"id": "item1", "name": "Sandwich", "price": 40.0, "quantity": 1}
        ],
        "total_amount": 60.0,
    }

    created_oid = str(ObjectId())

    with patch("app.routes.order.database") as mock_db, \
         patch("app.routes.order.create_order", AsyncMock(return_value=created_oid)) as mock_create_order, \
         patch("app.routes.order.schedule_notification", MagicMock()):
        
        mock_db["coupons"].find_one = AsyncMock(return_value=mock_coupon)
        mock_db["coupons"].update_one = AsyncMock()

        resp = client.post("/orders", json=payload, headers=customer_auth_headers)
        assert resp.status_code == 200, resp.text

        # update_one should NOT have been called
        mock_db["coupons"].update_one.assert_not_awaited()

        created_data = mock_create_order.call_args[0][0]
        assert created_data["discount_amount"] == 0.0
        assert created_data["coupon_code"] is None
        assert created_data["total_amount"] == 60.0


def test_order_creation_cash_roundoff(client, customer_auth_headers):
    """Verifies cash round-off calculation on COD orders."""
    # Items subtotal: 35.0
    # GST (5%): 1.75
    # Delivery fee: 15.0
    # Platform fee: 3.0
    # Gross total: 35 + 1.75 + 15 + 3 = 54.75
    # Nearest rupee: round(54.75) = 55.0
    # Round-off: 55.0 - 54.75 = +0.25
    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Test Student",
        "phone": "9876543210",
        "address": "Hostel 1, Room 101",
        "fulfillment_mode": "delivery",
        "payment_method": "cod",
        "items": [
            {"id": "item1", "name": "Poha", "price": 35.0, "quantity": 1}
        ],
        "total_amount": 55.0,  # Rounded client total
    }

    created_oid = str(ObjectId())

    with patch("app.routes.order.database") as mock_db, \
         patch("app.routes.order.create_order", AsyncMock(return_value=created_oid)) as mock_create_order, \
         patch("app.routes.order.schedule_notification", MagicMock()):
        
        resp = client.post("/orders", json=payload, headers=customer_auth_headers)
        assert resp.status_code == 200, resp.text

        created_data = mock_create_order.call_args[0][0]
        assert created_data["round_off"] == 0.25
        assert created_data["total_amount"] == 55.0


def test_order_creation_anti_tamper_rejection(client, customer_auth_headers):
    """Verifies that an altered total beyond 1.0 rupee tolerance triggers HTTP 400."""
    # Items subtotal: 60.0
    # GST: 3.0, Delivery: 15.0, Platform: 3.0 -> Total: 81.0
    # Client maliciously sends total_amount: 10.0
    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Test Student",
        "phone": "9876543210",
        "address": "Hostel 1, Room 101",
        "fulfillment_mode": "delivery",
        "payment_method": "cod",
        "items": [
            {"id": "item1", "name": "Thali", "price": 60.0, "quantity": 1}
        ],
        "total_amount": 10.0,
    }

    with patch("app.routes.order.database") as mock_db, \
         patch("app.routes.order.create_order", AsyncMock()), \
         patch("app.routes.order.schedule_notification", MagicMock()):
        
        resp = client.post("/orders", json=payload, headers=customer_auth_headers)
        assert resp.status_code == 400
        assert "Order amount mismatch" in resp.json()["detail"]


def test_order_creation_takeaway_fulfillment(client, customer_auth_headers):
    """Verifies takeaway fulfillment mode has 0 delivery fee and ₹2 platform fee."""
    # Items subtotal: 50.0
    # GST: 2.50
    # Delivery fee: 0.0
    # Platform fee: 2.0
    # Total: 54.50 -> rounded 55.0 or 54.50
    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Test Student",
        "phone": "9876543210",
        "address": "Canteen Counter (Self Pickup)",
        "fulfillment_mode": "takeaway",
        "delivery_type": "COUNTER_TAKEAWAY",
        "payment_method": "online",
        "items": [
            {"id": "item1", "name": "Fried Rice", "price": 50.0, "quantity": 1}
        ],
        "total_amount": 54.50,
    }

    created_oid = str(ObjectId())

    with patch("app.routes.order.database") as mock_db, \
         patch("app.routes.order.create_order", AsyncMock(return_value=created_oid)) as mock_create_order, \
         patch("app.routes.order.schedule_notification", MagicMock()):
        
        resp = client.post("/orders", json=payload, headers=customer_auth_headers)
        assert resp.status_code == 200, resp.text

        created_data = mock_create_order.call_args[0][0]
        assert created_data["delivery_fee"] == 0.0
        assert created_data["platform_fee"] == 2.0
        assert created_data["fulfillment_mode"] == "takeaway"
        assert created_data["total_amount"] == 54.50
