"""Tests for empty DB handling, courier operational endpoints, and admin purge."""

from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import create_access_token
from app.auth.roles import ADMIN, DELIVERY_PARTNER, RESTAURANT_OWNER


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_headers():
    token = create_access_token(
        data={"sub": "admin_user", "email": "admin@campusbite.com", "role": ADMIN}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def restaurant_headers():
    token = create_access_token(
        data={
            "sub": "rest_owner_1",
            "email": "canteen@campus.edu",
            "role": RESTAURANT_OWNER,
            "restaurant_id": "rest_123",
            "restaurant_name": "Central Canteen",
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def courier_headers():
    token = create_access_token(
        data={
            "sub": "courier_123",
            "phone": "+919876543210",
            "role": DELIVERY_PARTNER,
            "name": "Rider Ramesh",
        }
    )
    return {"Authorization": f"Bearer {token}"}


from app.db.database import get_database


def test_restaurant_today_settlement_on_empty_db(client, restaurant_headers):
    """GET /restaurant/settlements/today returns 200 with zeroed structure when DB is empty."""
    mock_db = {
        "settlements": AsyncMock(find_one=AsyncMock(return_value=None)),
        "canteen_settlements": AsyncMock(find_one=AsyncMock(return_value=None)),
        "restaurants": AsyncMock(find_one=AsyncMock(return_value={"_id": "rest_123", "name": "Central Canteen"})),
    }

    app.dependency_overrides[get_database] = lambda: mock_db
    try:
        resp = client.get("/restaurant/settlements/today", headers=restaurant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        settlement = data.get("settlement", data)
        assert settlement.get("gross_sales") == 0.0
        assert settlement.get("net_payout") == 0.0
        assert settlement.get("orders_count") == 0
        assert settlement.get("status") == "pending"
        assert settlement.get("is_settled") is False
    finally:
        app.dependency_overrides.pop(get_database, None)


def test_courier_orders_active_on_empty_db(client, courier_headers):
    """GET /courier/orders/active returns count 0 and empty orders when no runs exist."""
    mock_cursor = AsyncMock()
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[])

    mock_db = {
        "orders": AsyncMock(find=lambda *args, **kwargs: mock_cursor),
    }

    with patch("app.routes.courier.database", mock_db):
        resp = client.get("/courier/orders/active", headers=courier_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert data.get("orders") == []
        assert data.get("count") == 0


def test_courier_me_and_stats_on_empty_db(client, courier_headers):
    """GET /courier/me and /courier/stats directly calculate cash_in_hand from unpaid COD orders (0.00 on empty DB)."""
    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    mock_db = {
        "orders": AsyncMock(find=lambda *args, **kwargs: mock_cursor),
        "delivery_partners": AsyncMock(
            find_one=AsyncMock(return_value={"phone": "+919876543210", "name": "Rider Ramesh"})
        ),
    }

    with patch("app.routes.courier.database", mock_db):
        # /courier/me
        resp_me = client.get("/courier/me", headers=courier_headers)
        assert resp_me.status_code == 200
        data_me = resp_me.json()
        assert data_me.get("success") is True
        assert data_me.get("cash_in_hand") == 0.0
        assert data_me.get("net_cash_due") == 0.0
        assert data_me.get("is_locked") is False

        # /courier/stats
        resp_stats = client.get("/courier/stats", headers=courier_headers)
        assert resp_stats.status_code == 200
        data_stats = resp_stats.json()
        assert data_stats.get("success") is True
        assert data_stats.get("cash_in_hand") == 0.0
        assert data_stats.get("total_payout_earned") == 0.0



def test_admin_purge_test_data(client, admin_headers):
    """POST /admin/system/purge-test-data wipes test data and resets courier stats."""
    mock_orders = AsyncMock(delete_many=AsyncMock(return_value=None))
    mock_settlements = AsyncMock(delete_many=AsyncMock(return_value=None))
    mock_payouts = AsyncMock(delete_many=AsyncMock(return_value=None))
    mock_partners = AsyncMock(update_many=AsyncMock(return_value=None))
    mock_remittances = AsyncMock(delete_many=AsyncMock(return_value=None))

    mock_db = {
        "orders": mock_orders,
        "settlements": mock_settlements,
        "payouts": mock_payouts,
        "delivery_partners": mock_partners,
        "rider_remittances": mock_remittances,
    }

    with patch("app.routers.admin.database", mock_db), patch("app.routers.admin.log_admin_action", AsyncMock()):
        resp = client.post("/admin/system/purge-test-data", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert data.get("message") == "All transactional data cleanly purged"

        mock_orders.delete_many.assert_called_once_with({})
        mock_settlements.delete_many.assert_called_once_with({})
        mock_payouts.delete_many.assert_called_once_with({})
        mock_partners.update_many.assert_called_once()


def test_admin_purge_all_data(client, admin_headers):
    """POST /admin/system/purge-all-data wipes all transactions and resets courier accounts."""
    mock_orders = AsyncMock(delete_many=AsyncMock(return_value=None))
    mock_settlements = AsyncMock(delete_many=AsyncMock(return_value=None))
    mock_canteen_settlements = AsyncMock(delete_many=AsyncMock(return_value=None))
    mock_payouts = AsyncMock(delete_many=AsyncMock(return_value=None))
    mock_couriers = AsyncMock(update_many=AsyncMock(return_value=None))
    mock_partners = AsyncMock(update_many=AsyncMock(return_value=None))

    mock_db = {
        "orders": mock_orders,
        "settlements": mock_settlements,
        "canteen_settlements": mock_canteen_settlements,
        "payouts": mock_payouts,
        "couriers": mock_couriers,
        "delivery_partners": mock_partners,
    }

    app.dependency_overrides[get_database] = lambda: mock_db
    try:
        with patch("app.routers.admin.database", mock_db), patch("app.routers.admin.log_admin_action", AsyncMock()):
            resp = client.post("/admin/system/purge-all-data", headers=admin_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data.get("success") is True
            assert data.get("message") == "All orders and ledgers completely wiped to zero"

            mock_orders.delete_many.assert_called_once_with({})
            mock_settlements.delete_many.assert_called_once_with({})
            mock_canteen_settlements.delete_many.assert_called_once_with({})
            mock_payouts.delete_many.assert_called_once_with({})
            mock_couriers.update_many.assert_called_once()
            mock_partners.update_many.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_database, None)

