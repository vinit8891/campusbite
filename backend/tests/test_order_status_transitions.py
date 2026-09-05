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

    for s in ["Assigned", "picked_up", "picked up", "out_for_delivery", "out for delivery", "out-for-delivery"]:
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
    assert can_transition_to("out_for_delivery", "picked_up") is True
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
