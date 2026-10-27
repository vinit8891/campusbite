"""Unit tests for Automated Batch Delivery Clustering and Orders Router."""

import pytest
from app.services.batching import (
    cluster_orders_into_batches,
    get_next_batch_window,
)
from app.routers.orders import get_batch_window, cluster_candidate_orders


def test_cluster_orders_single_hostel_same_canteen():
    """Two orders for Hostel Block A from Main Canteen cluster together."""
    orders = [
        {
            "_id": "order_1",
            "delivery_type": "HOSTEL_BATCH",
            "hostel_block": "Hostel Block A",
            "restaurant_email": "canteen@zeal.edu",
            "tip_amount": 0.0,
            "latitude": 18.4485,
            "longitude": 73.8267,
        },
        {
            "_id": "order_2",
            "delivery_type": "HOSTEL_BATCH",
            "hostel_block": "Hostel Block A",
            "restaurant_email": "canteen@zeal.edu",
            "tip_amount": 5.0,
            "latitude": 18.4486,
            "longitude": 73.8268,
        },
    ]

    batches = cluster_orders_into_batches(orders)
    assert len(batches) == 1

    batch = batches[0]
    assert batch["hostel_block"] == "Hostel Block A"
    assert batch["total_orders"] == 2
    # 2 orders wage: 20 (base) + 14 (addon) + 5 (tip) = 39.00
    assert batch["total_wages"] == 39.00
    assert batch["total_tips"] == 5.0

    # First order is base, second is addon
    assert batch["orders"][0]["is_batch_addon"] is False
    assert batch["orders"][0]["courier_earning"] == 20.0
    assert batch["orders"][1]["is_batch_addon"] is True
    assert batch["orders"][1]["courier_earning"] == 14.0

    # Google Maps navigation URL is present
    assert "https://www.google.com/maps/dir/?api=1&destination=" in batch["maps_navigation_url"]


def test_cluster_orders_different_hostels_separate_batches():
    """Orders for different hostel blocks are separated into distinct runner batches."""
    orders = [
        {
            "_id": "ord_block_a",
            "delivery_type": "HOSTEL_BATCH",
            "hostel_block": "Hostel Block A",
            "restaurant_email": "canteen@zeal.edu",
        },
        {
            "_id": "ord_girls_hostel",
            "delivery_type": "HOSTEL_BATCH",
            "hostel_block": "Girls Hostel Reception",
            "restaurant_email": "canteen@zeal.edu",
        },
    ]

    batches = cluster_orders_into_batches(orders)
    assert len(batches) == 2
    hostels = {b["hostel_block"] for b in batches}
    assert hostels == {"Hostel Block A", "Girls Hostel Reception"}


def test_takeaway_orders_excluded_from_runner_batches():
    """Counter pickup orders must not be clustered into courier batches."""
    orders = [
        {
            "_id": "takeaway_1",
            "delivery_type": "COUNTER_TAKEAWAY",
            "fulfillment_mode": "takeaway",
            "hostel_block": "Zeal Main Canteen Pickup",
            "restaurant_email": "canteen@zeal.edu",
        },
        {
            "_id": "delivery_1",
            "delivery_type": "DELIVERY",
            "hostel_block": "Boys Hostel 1 Gate",
            "restaurant_email": "canteen@zeal.edu",
        },
    ]

    batches = cluster_orders_into_batches(orders)
    assert len(batches) == 1
    assert batches[0]["hostel_block"] == "Boys Hostel 1 Gate"
    assert batches[0]["total_orders"] == 1


def test_get_next_batch_window_structure():
    """Validates batch window has slot ID, delivery window, and cutoff info."""
    window = get_next_batch_window()
    assert "slot_id" in window
    assert "delivery_window" in window
    assert "minutes_remaining" in window
    assert isinstance(window["minutes_remaining"], int)


def test_orders_router_batch_window_endpoint():
    """Validates the GET /batch-window router endpoint output."""
    res = get_batch_window()
    assert res["success"] is True
    assert "batch_window" in res
    assert "slot_id" in res["batch_window"]


def test_orders_router_cluster_endpoint():
    """Validates the POST /batches/cluster router endpoint."""
    orders = [
        {
            "_id": "ord_test_1",
            "delivery_type": "HOSTEL_BATCH",
            "hostel_block": "Boys Hostel 2 Gate",
            "restaurant_email": "canteen@zeal.edu",
        }
    ]
    res = cluster_candidate_orders(orders)
    assert res["success"] is True
    assert res["batch_count"] == 1
    assert res["batches"][0]["hostel_block"] == "Boys Hostel 2 Gate"
