"""Unit tests for COD order payment status upon delivery OTP completion."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest

from app.models.order import verify_delivery_otp
from app.routes.order import _apply_payment_defaults, _public_order


def test_apply_payment_defaults_cod_active():
    """Active COD order keeps payment_status as pending."""
    order = {
        "status": "Out for Delivery",
        "payment_method": "Cash on Delivery (COD)",
        "payment_status": "pending",
    }
    result = _apply_payment_defaults(order)
    assert result["payment_status"] == "pending"


def test_apply_payment_defaults_cod_delivered():
    """Delivered COD order is automatically reflected as paid."""
    order = {
        "status": "Delivered",
        "payment_method": "Cash on Delivery (COD)",
        "payment_status": "pending",
    }
    result = _apply_payment_defaults(order)
    assert result["payment_status"] == "paid"


def test_apply_payment_defaults_cod_already_paid():
    """COD order already marked paid retains paid status."""
    order = {
        "status": "Delivered",
        "payment_method": "cod",
        "payment_status": "paid",
    }
    result = _apply_payment_defaults(order)
    assert result["payment_status"] == "paid"


def test_public_order_strips_delivery_otp_and_reflects_paid_for_delivered_cod():
    """Public order serializer strips OTP and applies paid payment status for delivered COD."""
    order = {
        "_id": "507f1f77bcf86cd799439011",
        "status": "Delivered",
        "payment_method": "COD",
        "payment_status": "pending",
        "delivery_otp": 4321,
    }
    result = _public_order(order)
    assert "delivery_otp" not in result
    assert result["payment_status"] == "paid"


@pytest.mark.asyncio
async def test_verify_delivery_otp_marks_cod_as_paid():
    """When delivery OTP is verified for a COD order, status becomes Delivered and payment_status becomes paid."""
    test_oid = ObjectId()
    mock_order = {
        "_id": test_oid,
        "status": "Out for Delivery",
        "otp_verified": False,
        "delivery_otp": "7890",
        "payment_method": "Cash on Delivery (COD)",
        "payment_status": "pending",
        "total": 250.0,
    }

    mock_collection = AsyncMock()
    mock_collection.find_one = AsyncMock(return_value=mock_order)
    mock_update_result = AsyncMock()
    mock_update_result.modified_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_update_result)

    with patch("app.models.order.order_collection", mock_collection):
        success = await verify_delivery_otp(str(test_oid), "7890")

        assert success is True
        mock_collection.update_one.assert_called_once()
        call_args = mock_collection.update_one.call_args[0]
        filter_clause = call_args[0]
        update_clause = call_args[1]

        assert filter_clause["_id"] == test_oid
        assert update_clause["$set"]["status"] == "Delivered"
        assert update_clause["$set"]["otp_verified"] is True
        assert update_clause["$set"]["payment_status"] == "paid"
        assert "paid_at" in update_clause["$set"]
        assert "delivered_at" in update_clause["$set"]


@pytest.mark.asyncio
async def test_verify_delivery_otp_increments_failed_attempts():
    """Incorrect OTP increments failed_otp_attempts counter."""
    test_oid = ObjectId()
    mock_order = {
        "_id": test_oid,
        "status": "Out for Delivery",
        "otp_verified": False,
        "delivery_otp": "7890",
        "failed_otp_attempts": 2,
    }

    mock_collection = AsyncMock()
    mock_collection.find_one = AsyncMock(return_value=mock_order)
    mock_collection.update_one = AsyncMock()

    with patch("app.models.order.order_collection", mock_collection):
        success = await verify_delivery_otp(str(test_oid), "1111")

        assert success is False
        mock_collection.update_one.assert_called_once_with(
            {"_id": test_oid},
            {"$inc": {"failed_otp_attempts": 1}},
        )


@pytest.mark.asyncio
async def test_verify_delivery_otp_locks_out_after_five_failed_attempts():
    """When failed_otp_attempts reaches 5, OTP verification is rejected."""
    test_oid = ObjectId()
    mock_order = {
        "_id": test_oid,
        "status": "Out for Delivery",
        "otp_verified": False,
        "delivery_otp": "7890",
        "failed_otp_attempts": 5,
    }

    mock_collection = AsyncMock()
    mock_collection.find_one = AsyncMock(return_value=mock_order)

    with patch("app.models.order.order_collection", mock_collection):
        success = await verify_delivery_otp(str(test_oid), "7890")
        assert success is False


@pytest.mark.asyncio
async def test_assign_delivery_partner_matches_missing_or_null_partner():
    """assign_delivery_partner uses symmetrical $or filter to match unassigned orders."""
    from app.models.order import assign_delivery_partner

    test_oid = ObjectId()
    mock_collection = AsyncMock()
    mock_update_result = AsyncMock()
    mock_update_result.modified_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_update_result)

    with patch("app.models.order.order_collection", mock_collection):
        success = await assign_delivery_partner(
            str(test_oid), "Rohan", "9876543210", "Bike"
        )
        assert success is True

        call_args = mock_collection.update_one.call_args[0]
        filter_clause = call_args[0]
        assert filter_clause["_id"] == test_oid
        assert filter_clause["status"] == "Ready for Pickup"
        assert "$or" in filter_clause


@pytest.mark.asyncio
async def test_emergency_deliver_order():
    """Emergency delivery bypasses OTP, marks Delivered, and sets emergency audit log."""
    from app.models.order import emergency_deliver_order

    test_oid = ObjectId()
    mock_order = {
        "_id": test_oid,
        "status": "Out for Delivery",
        "otp_verified": False,
        "payment_method": "online",
        "payment_status": "paid",
    }

    mock_collection = AsyncMock()
    mock_collection.find_one = AsyncMock(return_value=mock_order)
    mock_update_result = AsyncMock()
    mock_update_result.modified_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_update_result)

    with patch("app.models.order.order_collection", mock_collection):
        success = await emergency_deliver_order(
            str(test_oid), "Customer phone dead", "owner@canteen.com"
        )
        assert success is True

        call_args = mock_collection.update_one.call_args[0]
        update_clause = call_args[1]
        assert update_clause["$set"]["status"] == "Delivered"
        assert update_clause["$set"]["otp_verified"] is True
        assert update_clause["$set"]["emergency_delivery"]["bypassed"] is True
        assert update_clause["$set"]["emergency_delivery"]["reason"] == "Customer phone dead"

