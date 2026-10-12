"""Unit tests for Admin settlements and courier CIH payouts."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from datetime import datetime
import pytest
from app.routers.admin import parse_date_range


class MockCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, *args, **kwargs):
        return self

    async def to_list(self, length=None):
        return self.items


def test_parse_date_range_formats():
    # 1. YYYY-MM-DD
    start_dt, end_dt, date_prefix = parse_date_range("2026-10-12")
    assert date_prefix == "2026-10-12"
    assert start_dt == datetime(2026, 10, 12, 0, 0, 0)
    assert end_dt == datetime(2026, 10, 12, 23, 59, 59, 999999)

    # 2. DD-MM-YYYY
    start_dt2, end_dt2, date_prefix2 = parse_date_range("12-10-2026")
    assert date_prefix2 == "2026-10-12"
    assert start_dt2 == datetime(2026, 10, 12, 0, 0, 0)

    # 3. None / Empty fallback to today
    start_dt3, end_dt3, date_prefix3 = parse_date_range(None)
    today_str = datetime.now().strftime("%Y-%m-%d")
    assert date_prefix3 == today_str


@pytest.mark.asyncio
async def test_get_canteen_settlements_breakdown_aggregations():
    """Validates canteen financial aggregation: gross sales, 18% commission, 5% GST, and net payout."""
    from app.routers.admin import get_canteen_settlements_breakdown

    mock_db = {
        "orders": AsyncMock(),
        "restaurants": AsyncMock(),
        "canteen_settlements": AsyncMock(),
    }

    mock_restaurants = [
        {
            "_id": "rest-1",
            "name": "Taj Canteen",
            "email": "taj@campusbite.in",
            "phone": "9876543210",
            "settlement_upi_id": "taj@okaxis",
        }
    ]
    mock_orders = [
        {
            "_id": "order-1",
            "restaurant_id": "rest-1",
            "status": "delivered",
            "items_subtotal": 500.0,
            "gst": 25.0,
            "created_at": "2026-10-12T12:00:00Z",
        },
        {
            "_id": "order-2",
            "restaurant_id": "rest-1",
            "status": "completed",
            "items_subtotal": 300.0,
            "gst": 15.0,
            "created_at": "2026-10-12T15:00:00Z",
        },
    ]

    mock_db["restaurants"].find = lambda query: MockCursor(mock_restaurants)
    mock_db["orders"].find = lambda query: MockCursor(mock_orders)
    mock_db["canteen_settlements"].find = lambda query: MockCursor([])

    with patch("app.routers.admin.database", mock_db):
        res = await get_canteen_settlements_breakdown(
            _={"role": "admin", "email": "admin@campusbite.in"},
            date="2026-10-12",
        )

        assert len(res["canteens"]) == 1
        canteen = res["canteens"][0]
        assert canteen["restaurant_name"] == "Taj Canteen"
        assert canteen["orders_count"] == 2
        # Gross = 500 + 300 = 800
        assert canteen["gross_food_sales"] == 800.0
        # 18% commission of 800 = 144
        assert canteen["platform_commission"] == 144.0
        # GST = 25 + 15 = 40
        assert canteen["gst_collected"] == 40.0
        # Net payout = 800 - 144 + 40 = 696.0
        assert canteen["net_payout"] == 696.0
        assert canteen["status"] == "Pending"
        assert res["summary"]["total_food_sales"] == 800.0
        assert res["summary"]["total_commission"] == 144.0
        assert res["summary"]["pending_payout"] == 696.0


@pytest.mark.asyncio
async def test_get_courier_settlements_breakdown_aggregations():
    """Validates courier CIH calculation: COD collected, ₹20 wages, net cash due to admin."""
    from app.routers.admin import get_courier_settlements_breakdown

    mock_db = {
        "orders": AsyncMock(),
        "delivery_partners": AsyncMock(),
    }

    mock_partners = [
        {
            "_id": "rider-1",
            "name": "Rohan Deshmukh",
            "phone": "9876500001",
            "vehicle": "Electric Scooter",
            "cash_in_hand": 0.0,
            "total_payout_earned": 0.0,
        }
    ]
    mock_orders = [
        # Order 1: COD of 300
        {
            "_id": "ord-1",
            "delivery_partner_id": "rider-1",
            "status": "delivered",
            "payment_method": "cod",
            "total_amount": 300.0,
            "created_at": "2026-10-12T14:00:00Z",
        },
        # Order 2: Online of 200
        {
            "_id": "ord-2",
            "delivery_partner_id": "rider-1",
            "status": "delivered",
            "payment_method": "online",
            "total_amount": 200.0,
            "created_at": "2026-10-12T16:00:00Z",
        },
    ]

    mock_db["delivery_partners"].find = lambda query: MockCursor(mock_partners)
    mock_db["orders"].find = lambda query: MockCursor(mock_orders)

    with patch("app.routers.admin.database", mock_db):
        res = await get_courier_settlements_breakdown(
            _={"role": "admin", "email": "admin@campusbite.in"},
            date="2026-10-12",
        )

        assert len(res["couriers"]) == 1
        rider = res["couriers"][0]
        assert rider["name"] == "Rohan Deshmukh"
        assert rider["orders_completed"] == 2
        assert rider["cod_collected"] == 300.0
        # Wages: 2 orders * 20.0 = 40.0
        assert rider["wages_earned"] == 40.0
        # Net due to admin: 300 - 40 = 260.0
        assert rider["net_cash_due_to_admin"] == 260.0
        assert rider["is_locked"] is False
        assert rider["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_mark_canteen_settlement_paid_syncs_settlements_collection():
    """Validates that mark_canteen_settlement_paid writes status='paid', is_settled=True, and utr_number to settlements and canteen_settlements."""
    from app.routers.admin import mark_canteen_settlement_paid

    mock_settlements = AsyncMock()
    mock_canteen_settlements = AsyncMock()
    mock_restaurants = AsyncMock()
    mock_restaurants.find_one = AsyncMock(return_value={
        "_id": "rest-1",
        "name": "Taj Canteen",
        "email": "taj@campusbite.in",
        "settlement_upi_id": "taj@okaxis",
    })

    mock_db = {
        "restaurants": mock_restaurants,
        "settlements": mock_settlements,
        "canteen_settlements": mock_canteen_settlements,
        "audit_logs": AsyncMock(),
    }

    with patch("app.routers.admin.database", mock_db):
        res = await mark_canteen_settlement_paid(
            canteen_id="rest-1",
            current_user={"role": "admin", "email": "admin@campusbite.in"},
            payload={
                "date": "2026-10-12",
                "amount": 696.0,
                "transaction_ref": "UPI/2026/TEST1234",
            },
        )

        assert res["success"] is True
        assert res["settlement"]["status"] == "paid"
        assert res["settlement"]["is_settled"] is True
        assert res["settlement"]["utr_number"] == "UPI/2026/TEST1234"

        # Assert settlements collection update_one was called with status="paid" and is_settled=True
        mock_settlements.update_one.assert_called_once()
        settle_call_args = mock_settlements.update_one.call_args
        assert settle_call_args[0][1]["$set"]["status"] == "paid"
        assert settle_call_args[0][1]["$set"]["is_settled"] is True
        assert settle_call_args[0][1]["$set"]["utr_number"] == "UPI/2026/TEST1234"

        # Assert canteen_settlements update_one was called
        mock_canteen_settlements.update_one.assert_called_once()
        canteen_call_args = mock_canteen_settlements.update_one.call_args
        assert canteen_call_args[0][1]["$set"]["status"] == "paid"
        assert canteen_call_args[0][1]["$set"]["is_settled"] is True
