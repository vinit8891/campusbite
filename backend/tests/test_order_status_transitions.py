import pytest
from app.models.order import canonicalize_status, can_transition_to


def test_canonicalize_status_empty_and_none():
    assert canonicalize_status(None) == ""
    assert canonicalize_status("") == ""
    assert canonicalize_status("   ") == ""


def test_canonicalize_status_aliases():
    assert canonicalize_status("Pending") == "pending"
    assert canonicalize_status("pending") == "pending"

    for s in ["Accepted", "accepted", "Preparing", "preparing", "cooking", "in_prep", "in prep", "in-prep"]:
        assert canonicalize_status(s) == "preparing"

    for s in ["Ready for Pickup", "ready", "ready_for_pickup", "ready%20for%20pickup", "READY"]:
        assert canonicalize_status(s) == "ready"

    assert canonicalize_status("Assigned") == "assigned"
    assert canonicalize_status("assigned") == "assigned"

    for s in ["picked_up", "picked up", "Picked Up"]:
        assert canonicalize_status(s) == "picked_up"

    for s in ["out_for_delivery", "out for delivery", "out-for-delivery", "In Transit", "in transit"]:
        assert canonicalize_status(s) == "out_for_delivery"

    for s in ["Delivered", "delivered", "Completed", "completed"]:
        assert canonicalize_status(s) == "delivered"

    for s in ["Cancelled", "cancelled", "Rejected", "rejected"]:
        assert canonicalize_status(s) == "cancelled"


def test_can_transition_to_idempotency():
    # Same canonical state must always return True
    assert can_transition_to("Pending", "pending") is True
    assert can_transition_to("Preparing", "cooking") is True
    assert can_transition_to("cooking", "in_prep") is True
    assert can_transition_to("Ready for Pickup", "ready") is True
    assert can_transition_to("ready_for_pickup", "Ready for Pickup") is True
    assert can_transition_to("Assigned", "assigned") is True
    assert can_transition_to("picked_up", "Picked Up") is True
    assert can_transition_to("out_for_delivery", "out for delivery") is True
    assert can_transition_to("Delivered", "completed") is True
    assert can_transition_to("Cancelled", "rejected") is True


def test_can_transition_from_pending():
    assert can_transition_to("Pending", "Preparing") is True
    assert can_transition_to("Pending", "cooking") is True
    assert can_transition_to("Pending", "Ready for Pickup") is True
    assert can_transition_to("Pending", "Cancelled") is True
    assert can_transition_to("Pending", "rejected") is True
    assert can_transition_to("Pending", "Delivered") is False


def test_can_transition_from_preparing():
    assert can_transition_to("Preparing", "Ready for Pickup") is True
    assert can_transition_to("Preparing", "ready") is True
    assert can_transition_to("Preparing", "Preparing") is True  # Re-cooking
    assert can_transition_to("Preparing", "cooking") is True
    assert can_transition_to("Preparing", "Cancelled") is True
    assert can_transition_to("Preparing", "Delivered") is False


def test_can_transition_from_ready():
    # Relaxed kitchen boundaries: Allow reverting to preparing if marked ready by accident
    assert can_transition_to("Ready for Pickup", "Preparing") is True
    assert can_transition_to("Ready for Pickup", "cooking") is True
    assert can_transition_to("Ready for Pickup", "Out for Delivery") is True
    assert can_transition_to("Ready for Pickup", "picked_up") is True
    assert can_transition_to("Ready for Pickup", "Delivered") is True
    assert can_transition_to("Ready for Pickup", "Cancelled") is True


def test_can_transition_from_out_for_delivery():
    assert can_transition_to("Out for Delivery", "Delivered") is True
    assert can_transition_to("Out for Delivery", "completed") is True
    assert can_transition_to("Out for Delivery", "Cancelled") is True
    assert can_transition_to("Out for Delivery", "Preparing") is False


def test_can_transition_from_terminal_states():
    assert can_transition_to("Delivered", "Preparing") is False
    assert can_transition_to("Delivered", "Cancelled") is False
    assert can_transition_to("Cancelled", "Preparing") is False
    assert can_transition_to("Cancelled", "Delivered") is False


def test_can_transition_url_encoded_and_mixed_casing():
    assert can_transition_to("ready%20for%20pickup", "preparing") is True
    assert can_transition_to("in-prep", "READY_FOR_PICKUP") is True


@pytest.mark.asyncio
async def test_update_order_status_simulations():
    from unittest.mock import AsyncMock, patch
    from bson import ObjectId
    from app.models.order import update_order_status

    test_oid = ObjectId()

    # Case 1: Pending -> Preparing
    mock_order_pending = {
        "_id": test_oid,
        "status": "Pending",
        "payment_method": "cod",
        "payment_status": "pending",
    }
    mock_collection = AsyncMock()
    mock_collection.find_one = AsyncMock(return_value=mock_order_pending)
    mock_update_res = AsyncMock()
    mock_update_res.matched_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_update_res)

    with patch("app.models.order.order_collection", mock_collection):
        res = await update_order_status(str(test_oid), "Preparing")
        assert res is True
        mock_collection.update_one.assert_called_once()
        update_set = mock_collection.update_one.call_args[0][1]["$set"]
        assert update_set["status"] == "Preparing"
        assert "accepted_at" in update_set

    # Case 2: Accepted -> Preparing (Idempotent)
    mock_order_accepted = {
        "_id": test_oid,
        "status": "Accepted",
        "payment_method": "cod",
        "payment_status": "pending",
    }
    mock_collection.find_one = AsyncMock(return_value=mock_order_accepted)
    with patch("app.models.order.order_collection", mock_collection):
        res = await update_order_status(str(test_oid), "Preparing")
        assert res is True  # Idempotent

    # Case 3: in_prep -> Ready for Pickup
    mock_order_in_prep = {
        "_id": test_oid,
        "status": "in_prep",
        "payment_method": "cod",
        "payment_status": "pending",
    }
    mock_collection.find_one = AsyncMock(return_value=mock_order_in_prep)
    mock_collection.update_one = AsyncMock(return_value=mock_update_res)
    with patch("app.models.order.order_collection", mock_collection):
        res = await update_order_status(str(test_oid), "Ready for Pickup")
        assert res is True
        update_set = mock_collection.update_one.call_args[0][1]["$set"]
        assert update_set["status"] == "Ready for Pickup"
        assert "ready_at" in update_set

    # Case 4: Ready for Pickup -> Preparing (Revert)
    mock_order_ready = {
        "_id": test_oid,
        "status": "Ready for Pickup",
        "payment_method": "cod",
        "payment_status": "pending",
    }
    mock_collection.find_one = AsyncMock(return_value=mock_order_ready)
    mock_collection.update_one = AsyncMock(return_value=mock_update_res)
    with patch("app.models.order.order_collection", mock_collection):
        res = await update_order_status(str(test_oid), "Preparing")
        assert res is True
        update_set = mock_collection.update_one.call_args[0][1]["$set"]
        assert update_set["status"] == "Preparing"


@pytest.mark.asyncio
async def test_change_status_endpoint_simulation():
    from unittest.mock import AsyncMock, patch
    from fastapi import BackgroundTasks
    from app.routes.order import change_status

    test_id = "507f1f77bcf86cd799439011"
    bg = BackgroundTasks()

    # Restaurant owner user mock
    owner_user = {
        "sub": "owner_1",
        "email": "owner@restaurant.com",
        "role": "RESTAURANT_OWNER",
    }

    # 1. Simulate order currently "pending" updated to "Preparing"
    mock_order_1 = {
        "_id": test_id,
        "restaurant_email": "owner@restaurant.com",
        "status": "Pending",
        "payment_method": "cod",
        "payment_status": "pending",
    }
    with patch("app.routes.order.get_order_by_id", AsyncMock(return_value=mock_order_1)), \
         patch("app.routes.order.update_order_status", AsyncMock(return_value=True)):
        res = await change_status(test_id, "Preparing", bg, owner_user)
        assert res["success"] is True
        assert res["status"] == "Preparing"

    # 2. Simulate order currently "Accepted" updated to "Ready for Pickup"
    mock_order_2 = {
        "_id": test_id,
        "restaurant_email": "owner@restaurant.com",
        "status": "Accepted",
        "payment_method": "cod",
        "payment_status": "pending",
    }
    with patch("app.routes.order.get_order_by_id", AsyncMock(return_value=mock_order_2)), \
         patch("app.routes.order.update_order_status", AsyncMock(return_value=True)):
        res = await change_status(test_id, "Ready for Pickup", bg, owner_user)
        assert res["success"] is True
        assert res["status"] == "Ready for Pickup"

    # 4. Simulate courier partner transitioning Assigned -> Picked Up
    courier_user = {
        "sub": "courier_1",
        "phone": "9876543210",
        "role": "DELIVERY_PARTNER",
    }
    mock_order_assigned = {
        "_id": test_id,
        "status": "Assigned",
        "delivery_partner": {"phone": "9876543210"},
        "payment_method": "cod",
        "payment_status": "pending",
    }
    with patch("app.routes.order.get_order_by_id", AsyncMock(return_value=mock_order_assigned)), \
         patch("app.routes.order.update_order_status", AsyncMock(return_value=True)):
        res = await change_status(test_id, "Picked Up", bg, courier_user)
        assert res["success"] is True
        assert res["status"] == "Picked Up"

    # 5. Simulate courier partner transitioning Picked Up -> Out for Delivery
    mock_order_picked_up = {
        "_id": test_id,
        "status": "Picked Up",
        "delivery_partner": {"phone": "9876543210"},
        "payment_method": "cod",
        "payment_status": "pending",
    }
    with patch("app.routes.order.get_order_by_id", AsyncMock(return_value=mock_order_picked_up)), \
         patch("app.routes.order.update_order_status", AsyncMock(return_value=True)):
        res = await change_status(test_id, "Out for Delivery", bg, courier_user)
        assert res["success"] is True
        assert res["status"] == "Out for Delivery"


