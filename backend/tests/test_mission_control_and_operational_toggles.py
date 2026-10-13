"""Unit tests for Step 4.1: Admin Mission Control, Operational Toggles, and Security Hardening."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.roles import ADMIN, DELIVERY_PARTNER, CUSTOMER
from app.auth.security import create_access_token


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_headers():
    token = create_access_token({
        "sub": "admin@campusbite.com",
        "role": ADMIN,
        "email": "admin@campusbite.com",
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def courier_headers():
    token = create_access_token({
        "sub": "courier@campusbite.com",
        "role": DELIVERY_PARTNER,
        "phone": "9876543210",
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_headers():
    token = create_access_token({
        "sub": "cust_test_123",
        "role": CUSTOMER,
        "email": "student@campusbite.com",
        "phone": "9876543210",
        "full_name": "Test Student",
    })
    return {"Authorization": f"Bearer {token}"}


def test_get_and_patch_system_config(client, admin_headers):
    """GET and PATCH /admin/system/config."""
    mock_system_doc = {
        "_id": "global_config",
        "is_platform_active": True,
        "maintenance_message": "CampusBite is currently paused for scheduled maintenance.",
        "max_cod_limit": 500.0,
        "surge_fee": 0.0,
        "operating_hours": {"start": "08:00", "end": "02:00"},
    }

    mock_col = MagicMock()
    mock_col.find_one = AsyncMock(return_value=mock_system_doc)
    mock_col.update_one = AsyncMock()

    mock_db = {"system_settings": mock_col}

    with patch("app.models.system._get_col", return_value=mock_col), \
         patch("app.routers.admin.get_database", return_value=mock_db), \
         patch("app.routers.admin.log_admin_action", new=AsyncMock()):

        # 1. GET
        resp = client.get("/admin/system/config", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["is_platform_active"] is True
        assert data["surge_fee"] == 0.0

        # 2. PATCH
        patch_payload = {
            "is_platform_active": False,
            "maintenance_message": "Emergency maintenance in progress.",
            "surge_fee": 20.0,
        }
        mock_col.find_one = AsyncMock(return_value={**mock_system_doc, **patch_payload})

        patch_resp = client.patch("/admin/system/config", json=patch_payload, headers=admin_headers)
        assert patch_resp.status_code == 200
        updated_data = patch_resp.json()
        assert updated_data["success"] is True
        assert updated_data["config"]["is_platform_active"] is False
        assert updated_data["config"]["maintenance_message"] == "Emergency maintenance in progress."
        assert updated_data["config"]["surge_fee"] == 20.0


def test_checkout_guard_blocks_when_platform_inactive(client, customer_headers):
    """Checkout guard returns 503 when platform is inactive."""
    mock_sys_config = {
        "is_platform_active": False,
        "maintenance_message": "CampusBite is currently paused for scheduled maintenance.",
    }

    order_payload = {
        "restaurant_email": "canteen@campusbite.com",
        "customer_name": "Test Student",
        "phone": "9876543210",
        "address": "Room 101, Hostel A",
        "payment_method": "cod",
        "fulfillment_mode": "delivery",
        "delivery_type": "HOSTEL_BATCH",
        "items": [{"id": "item1", "name": "Veg Thali", "price": 100.0, "quantity": 1}],
        "total": 100.0,
    }

    with patch("app.models.system.get_system_settings", new=AsyncMock(return_value=mock_sys_config)), \
         patch("app.routes.order.get_system_settings", new=AsyncMock(return_value=mock_sys_config)):
        resp = client.post("/orders/", json=order_payload, headers=customer_headers)
        assert resp.status_code == 503
        assert "scheduled maintenance" in resp.json()["detail"]


def test_canteen_toggle_status_and_order_rejection(client, admin_headers, customer_headers):
    """Admin can toggle is_accepting_orders and checkout blocks when False."""
    canteen_id = ObjectId()
    canteen_doc = {
        "_id": canteen_id,
        "name": "North Canteen",
        "email": "north_canteen@campusbite.com",
        "is_accepting_orders": True,
        "is_open": True,
    }

    mock_rest_col = MagicMock()
    mock_rest_col.find_one = AsyncMock(return_value=canteen_doc)
    mock_rest_col.update_one = AsyncMock()

    mock_db = {"restaurants": mock_rest_col}

    with patch("app.routers.admin._get_col", return_value=mock_rest_col), \
         patch("app.routers.admin.get_database", return_value=mock_db), \
         patch("app.routers.admin.log_admin_action", new=AsyncMock()):

        # Toggle status to False
        resp = client.patch(
            f"/admin/canteens/{str(canteen_id)}/toggle-status",
            json={"is_accepting_orders": False},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["is_accepting_orders"] is False
        mock_rest_col.update_one.assert_called_once()

    # Now verify that order placement is rejected when canteen is_accepting_orders is False
    canteen_doc_paused = {
        **canteen_doc,
        "is_accepting_orders": False,
        "is_verified": True,
        "verification_status": "approved",
    }
    mock_sys_config = {"is_platform_active": True}

    with patch("app.models.system.get_system_settings", new=AsyncMock(return_value=mock_sys_config)), \
         patch("app.routes.order.get_system_settings", new=AsyncMock(return_value=mock_sys_config)), \
         patch("app.models.restaurant.get_restaurant_by_email", new=AsyncMock(return_value=canteen_doc_paused)):

        order_payload = {
            "restaurant_email": "north_canteen@campusbite.com",
            "customer_name": "Test Student",
            "phone": "9876543210",
            "address": "Room 101, Hostel A",
            "payment_method": "cod",
            "fulfillment_mode": "delivery",
            "delivery_type": "HOSTEL_BATCH",
            "items": [{"id": "item1", "name": "Noodles", "price": 90.0, "quantity": 1}],
            "total": 90.0,
        }
        order_resp = client.post("/orders/", json=order_payload, headers=customer_headers)
        assert order_resp.status_code == 400
        assert "not accepting orders" in order_resp.json()["detail"].lower()


def test_partner_verification_queue_and_approval(client, admin_headers):
    """GET /admin/partners/pending and POST /admin/partners/{id}/verify."""
    courier_id = ObjectId()
    courier_doc = {
        "_id": courier_id,
        "name": "Rider Kumar",
        "phone": "9876543210",
        "email": "rider@campusbite.com",
        "verification_status": "pending",
        "is_verified": False,
        "vehicle": "Bicycle",
    }

    class FakeCursor:
        def __init__(self, items):
            self.items = items
        async def to_list(self, limit):
            return self.items

    mock_partners_col = MagicMock()
    mock_partners_col.find = MagicMock(return_value=FakeCursor([courier_doc]))
    mock_partners_col.find_one = AsyncMock(return_value=courier_doc)
    mock_partners_col.update_one = AsyncMock()

    mock_rest_col = MagicMock()
    mock_rest_col.find = MagicMock(return_value=FakeCursor([]))

    def fake_get_col(db, name):
        if name == "delivery_partners":
            return mock_partners_col
        if name == "restaurants":
            return mock_rest_col
        return None

    with patch("app.routers.admin._get_col", side_effect=fake_get_col), \
         patch("app.routers.admin.get_database", return_value={"delivery_partners": mock_partners_col, "restaurants": mock_rest_col}):

        # 1. Fetch pending
        pending_resp = client.get("/admin/partners/pending", headers=admin_headers)
        assert pending_resp.status_code == 200
        pdata = pending_resp.json()
        assert pdata["success"] is True
        assert len(pdata["pending_couriers"]) == 1
        assert pdata["pending_couriers"][0]["name"] == "Rider Kumar"

        # 2. Approve courier
        verify_resp = client.post(
            f"/admin/partners/{str(courier_id)}/verify",
            json={"decision": "approved", "partner_type": "courier"},
            headers=admin_headers,
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["success"] is True
        assert verify_resp.json()["status"] in ("verified", "approved")
        mock_partners_col.update_one.assert_called_once()


def test_courier_otp_rate_limiting_and_lockout(client, courier_headers):
    """POST /courier/orders/{id}/verify-otp rate limiting and 5-attempt lockout."""
    order_id = ObjectId()
    order_doc = {
        "_id": order_id,
        "delivery_otp": "7890",
        "failed_otp_attempts": 0,
        "status": "out_for_delivery",
        "otp_verified": False,
    }

    mock_orders_col = MagicMock()
    mock_orders_col.find_one = AsyncMock(return_value=order_doc)
    mock_orders_col.update_one = AsyncMock()

    with patch("app.routes.courier._get_col", return_value=mock_orders_col), \
         patch("app.routes.courier.get_database", return_value={"orders": mock_orders_col}):

        # 1st failed attempt -> 4 remaining
        resp1 = client.post(
            f"/courier/orders/{str(order_id)}/verify-otp",
            json={"submitted_otp": "0000"},
            headers=courier_headers,
        )
        assert resp1.status_code == 400
        assert "Incorrect OTP. 4 attempt(s) remaining." in resp1.json()["detail"]

        # 4 failed attempts previously -> now 5th failed attempt -> 0 remaining
        order_doc["failed_otp_attempts"] = 4
        resp5 = client.post(
            f"/courier/orders/{str(order_id)}/verify-otp",
            json={"submitted_otp": "0000"},
            headers=courier_headers,
        )
        assert resp5.status_code == 400
        assert "Incorrect OTP. 0 attempt(s) remaining." in resp5.json()["detail"]

        # 5 or more failed attempts -> Locked out (HTTP 429)
        order_doc["failed_otp_attempts"] = 5
        resp_locked = client.post(
            f"/courier/orders/{str(order_id)}/verify-otp",
            json={"submitted_otp": "7890"},  # even with correct OTP, it's locked!
            headers=courier_headers,
        )
        assert resp_locked.status_code == 429
        assert "Too many incorrect OTP attempts. Order locked for security. Contact campus admin." in resp_locked.json()["detail"]


def test_courier_otp_successful_handover(client, courier_headers):
    """POST /courier/orders/{id}/verify-otp successfully hands over order."""
    order_id = ObjectId()
    order_doc = {
        "_id": order_id,
        "delivery_otp": "7890",
        "failed_otp_attempts": 1,
        "status": "out_for_delivery",
        "otp_verified": False,
    }

    mock_orders_col = MagicMock()
    mock_orders_col.find_one = AsyncMock(return_value=order_doc)
    mock_orders_col.update_one = AsyncMock()

    with patch("app.routes.courier._get_col", return_value=mock_orders_col), \
         patch("app.routes.courier.get_database", return_value={"orders": mock_orders_col}):

        resp = client.post(
            f"/courier/orders/{str(order_id)}/verify-otp",
            json={"submitted_otp": "7890"},
            headers=courier_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["status"] == "delivered"
        assert data["otp_verified"] is True
        mock_orders_col.update_one.assert_called_once()
