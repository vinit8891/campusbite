"""Unit tests for Step 4.2: Database Performance Indexing, Production Seeder, and System Health Diagnostics."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.init_indexes import ensure_database_indexes
from scripts.seed_production import (
    ZEAL_CANTEENS,
    purge_transactional_data,
    seed_canteens_and_admin,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.asyncio
async def test_ensure_database_indexes_creates_required_indexes():
    """Ensure database indexes function runs idempotently and creates all required indexes."""
    mock_db = MagicMock()
    mock_orders = AsyncMock()
    mock_settlements = AsyncMock()
    mock_canteen_settlements = AsyncMock()
    mock_users = AsyncMock()
    mock_couriers = AsyncMock()
    mock_delivery_partners = AsyncMock()
    mock_restaurants = AsyncMock()

    mock_db.orders = mock_orders
    mock_db.settlements = mock_settlements
    mock_db.canteen_settlements = mock_canteen_settlements
    mock_db.users = mock_users
    mock_db.couriers = mock_couriers
    mock_delivery_partners.name = "delivery_partners"
    mock_db.delivery_partners = mock_delivery_partners
    mock_db.restaurants = mock_restaurants

    await ensure_database_indexes(mock_db)

    # 1. Orders collection
    assert mock_orders.create_index.call_count >= 5
    orders_keys = [call.args[0] for call in mock_orders.create_index.call_args_list]
    assert [("courier_id", 1), ("status", 1)] in orders_keys
    assert [("restaurant_id", 1), ("created_at", -1)] in orders_keys
    assert [("customer_id", 1), ("created_at", -1)] in orders_keys
    assert [("status", 1), ("created_at", -1)] in orders_keys
    assert [("razorpay_order_id", 1)] in orders_keys

    # 2. Settlements collection
    assert mock_settlements.create_index.call_count >= 2
    settlements_keys = [call.args[0] for call in mock_settlements.create_index.call_args_list]
    assert [("restaurant_id", 1), ("date", -1)] in settlements_keys
    assert [("date", -1), ("status", 1)] in settlements_keys

    # 3. Users and Couriers
    assert mock_users.create_index.call_count >= 1
    users_keys = [call.args[0] for call in mock_users.create_index.call_args_list]
    assert [("email", 1)] in users_keys

    assert mock_couriers.create_index.call_count >= 2
    couriers_keys = [call.args[0] for call in mock_couriers.create_index.call_args_list]
    assert [("user_id", 1)] in couriers_keys
    assert [("is_locked", 1), ("is_active", 1)] in couriers_keys

    # 4. Restaurants
    assert mock_restaurants.create_index.call_count >= 2
    restaurants_keys = [call.args[0] for call in mock_restaurants.create_index.call_args_list]
    assert [("slug", 1)] in restaurants_keys
    assert [("is_accepting_orders", 1)] in restaurants_keys


@pytest.mark.asyncio
async def test_ensure_database_indexes_graceful_on_none_db():
    """Ensure function does not throw when database is None."""
    with patch("app.db.init_indexes.database", None):
        await ensure_database_indexes(None)


def test_production_health_endpoint_healthy(client):
    """GET /health returns 200 with structured database, payment_gateway, and platform status."""
    with patch("app.routes.health.ping_database", new_callable=AsyncMock) as mock_ping, \
         patch("app.routes.health.get_system_settings", new_callable=AsyncMock) as mock_sys:
        mock_ping.return_value = True
        mock_sys.return_value = {"is_platform_active": True}

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert isinstance(data["database"], dict)
        assert data["database"]["status"] == "connected"
        assert data["database"]["latency_ms"] >= 0

        assert isinstance(data["payment_gateway"], dict)
        assert data["payment_gateway"]["provider"] == "razorpay"
        assert "mode" in data["payment_gateway"]
        assert "configured" in data["payment_gateway"]

        assert isinstance(data["platform"], dict)
        assert data["platform"]["is_platform_active"] is True


def test_production_health_endpoint_unhealthy_on_db_down(client):
    """GET /health returns 'unhealthy' status when database ping fails."""
    with patch("app.routes.health.ping_database", new_callable=AsyncMock) as mock_ping, \
         patch("app.routes.health.get_system_settings", new_callable=AsyncMock) as mock_sys:
        mock_ping.return_value = False
        mock_sys.return_value = {"is_platform_active": True}

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "unhealthy"
        assert data["database"]["status"] == "disconnected"
        assert data["database"]["latency_ms"] == -1.0


def test_production_health_endpoint_degraded_when_platform_paused(client):
    """GET /health returns 'degraded' when database is up but platform kill-switch is active."""
    with patch("app.routes.health.ping_database", new_callable=AsyncMock) as mock_ping, \
         patch("app.routes.health.get_system_settings", new_callable=AsyncMock) as mock_sys:
        mock_ping.return_value = True
        mock_sys.return_value = {"is_platform_active": False}

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "degraded"
        assert data["database"]["status"] == "connected"
        assert data["platform"]["is_platform_active"] is False


@pytest.mark.asyncio
async def test_seeder_purge_transactional_data():
    """Purge function wipes development orders, settlements, and resets delivery partner balances."""
    mock_db = MagicMock()
    mock_col = AsyncMock()
    mock_col.delete_many.return_value = MagicMock(deleted_count=5)
    mock_col.update_many.return_value = MagicMock(modified_count=3)
    mock_db.__getitem__.return_value = mock_col
    mock_db.list_collection_names = AsyncMock(return_value=["delivery_partners"])

    counts = await purge_transactional_data(mock_db)
    assert counts["orders"] == 5
    assert counts["settlements"] == 5
    assert counts["canteen_settlements"] == 5
    assert mock_col.update_many.called


@pytest.mark.asyncio
async def test_seeder_seed_canteens_and_admin():
    """Seed function creates/updates admin, canonical Zeal canteens with 18% commission and 5% GST."""
    mock_db = MagicMock()
    users_col = AsyncMock()
    restaurants_col = AsyncMock()
    menu_col = AsyncMock()
    system_col = AsyncMock()

    users_col.find_one.return_value = None
    restaurants_col.find_one.return_value = None
    menu_col.find_one.return_value = None

    def get_collection(name):
        if name == "users":
            return users_col
        elif name == "restaurants":
            return restaurants_col
        elif name == "menu":
            return menu_col
        elif name == "system_settings":
            return system_col
        return AsyncMock()

    mock_db.__getitem__.side_effect = get_collection

    await seed_canteens_and_admin(mock_db)

    # 1. Admin inserted
    assert users_col.insert_one.called
    admin_args = users_col.insert_one.call_args[0][0]
    assert admin_args["email"] == "admin@campusbite.com"
    assert admin_args["role"] == "admin"

    # 2. Canonical Zeal canteens inserted
    assert restaurants_col.insert_one.call_count == len(ZEAL_CANTEENS)
    for call in restaurants_col.insert_one.call_args_list:
        eatery_doc = call[0][0]
        assert eatery_doc["commission_rate"] == 0.18
        assert eatery_doc["gst_rate"] == 0.05
        assert eatery_doc["is_accepting_orders"] is True
        assert eatery_doc["verification_status"] == "approved"

    # 3. System settings updated
    assert system_col.update_one.called
