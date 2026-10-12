"""Tests for Razorpay payment initiation and verification router."""

from __future__ import annotations

import hashlib
import hmac
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_create_order_nonexistent(client):
    """Returns 404 when order cannot be found in MongoDB."""
    with patch("app.routes.payments.database") as mock_db:
        mock_orders = AsyncMock()
        mock_orders.find_one.return_value = None
        mock_db.__getitem__.return_value = mock_orders
        mock_db.orders = mock_orders

        response = client.post(
            "/payments/create-order",
            json={"order_id": str(ObjectId()), "amount": 250.0},
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Order not found"


def test_create_order_success(client):
    """Creates Razorpay order and returns expected payload in paise."""
    order_id = ObjectId()
    mock_order = {
        "_id": order_id,
        "total_amount": 250.0,
        "customer_email": "test@campus.edu",
    }

    with patch("app.routes.payments.database") as mock_db, \
         patch("app.routes.payments._get_razorpay_client") as mock_client_factory:
        mock_orders = AsyncMock()
        mock_orders.find_one.return_value = mock_order
        mock_orders.update_one.return_value = MagicMock(modified_count=1)
        mock_db.__getitem__.return_value = mock_orders
        mock_db.orders = mock_orders

        mock_rzp_client = MagicMock()
        mock_rzp_client.order.create.return_value = {
            "id": "order_rzp_test_12345",
            "amount": 25000,
            "currency": "INR",
            "receipt": str(order_id),
            "status": "created",
        }
        mock_client_factory.return_value = (mock_rzp_client, "rzp_test_key_123", "secret_123")

        response = client.post(
            "/payments/create-order",
            json={"order_id": str(order_id), "amount": 250.0},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["razorpay_order_id"] == "order_rzp_test_12345"
        assert data["amount"] == 25000
        assert data["currency"] == "INR"
        assert data["key_id"] == "rzp_test_key_123"

        # Assert database was updated with razorpay_order_id
        mock_orders.update_one.assert_called_once()
        args, kwargs = mock_orders.update_one.call_args
        assert args[1]["$set"]["razorpay_order_id"] == "order_rzp_test_12345"


def test_verify_payment_invalid_signature(client):
    """Rejects invalid Razorpay signature with 400."""
    with patch("app.routes.payments._get_razorpay_client") as mock_client_factory:
        mock_rzp_client = MagicMock()
        import razorpay.errors
        mock_rzp_client.utility.verify_payment_signature.side_effect = (
            razorpay.errors.SignatureVerificationError("Signature Verification Failed")
        )
        mock_client_factory.return_value = (mock_rzp_client, "rzp_test_key_123", "secret_123")

        response = client.post(
            "/payments/verify",
            json={
                "razorpay_order_id": "order_123",
                "razorpay_payment_id": "pay_123",
                "razorpay_signature": "invalid_sig",
                "order_id": str(ObjectId()),
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid payment signature"


def test_verify_payment_success(client):
    """Verifies valid signature, updates order to paid_online, generates 4-digit OTP."""
    order_id = ObjectId()
    mock_order = {
        "_id": order_id,
        "total_amount": 250.0,
        "customer_email": "test@campus.edu",
    }

    secret = "secret_123"
    payload_str = "order_123|pay_123"
    valid_sig = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

    with patch("app.routes.payments.database") as mock_db, \
         patch("app.routes.payments._get_razorpay_client") as mock_client_factory:
        mock_orders = AsyncMock()
        mock_orders.find_one.return_value = mock_order
        mock_orders.update_one.return_value = MagicMock(modified_count=1)
        mock_db.__getitem__.return_value = mock_orders
        mock_db.orders = mock_orders

        mock_rzp_client = MagicMock()
        mock_rzp_client.utility.verify_payment_signature.return_value = True
        mock_client_factory.return_value = (mock_rzp_client, "rzp_test_key_123", secret)

        response = client.post(
            "/payments/verify",
            json={
                "razorpay_order_id": "order_123",
                "razorpay_payment_id": "pay_123",
                "razorpay_signature": valid_sig,
                "order_id": str(order_id),
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "paid_online"

        mock_orders.update_one.assert_called_once()
        args, kwargs = mock_orders.update_one.call_args
        set_fields = args[1]["$set"]
        assert set_fields["payment_status"] == "paid_online"
        assert set_fields["status"] == "placed"
        assert set_fields["razorpay_payment_id"] == "pay_123"
        assert set_fields["razorpay_signature"] == valid_sig
        assert 1000 <= set_fields["delivery_otp"] <= 9999
