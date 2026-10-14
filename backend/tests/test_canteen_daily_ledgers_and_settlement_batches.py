"""Unit tests for Daily 9:00 PM EOD Ledger Generation and Bi-Weekly (Tue/Fri) Settlement System."""

from __future__ import annotations

from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.services.canteen_ledger_service import (
    get_settlement_cycle,
    format_payout_date_friendly,
    generate_or_get_daily_canteen_ledger,
    get_canteen_daily_ledgers,
    get_canteen_upcoming_disbursal,
    settle_payout_batch,
    get_admin_current_disbursal_batches,
    get_admin_daily_platform_ledger,
    CANTEEN_COMMISSION_RATE,
)


class AsyncCursorMock:
    def __init__(self, docs):
        self.docs = list(docs)
        self.idx = 0

    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def __aiter__(self):
        self.idx = 0
        return self

    async def __anext__(self):
        if self.idx < len(self.docs):
            doc = self.docs[self.idx]
            self.idx += 1
            return doc
        raise StopAsyncIteration


# -------------------------------------------------------------
# 1. Cycle Assignment & Grouping Logic Tests
# -------------------------------------------------------------
def test_settlement_cycle_grouping_all_days():
    """
    Verifies that:
    - Orders from Monday, Tuesday, Wednesday -> scheduled for Friday payout (same week).
    - Orders from Thursday, Friday, Saturday, Sunday -> scheduled for Tuesday payout (next week).
    """
    # 2026-10-12 is Monday
    cycle, payout_date = get_settlement_cycle("2026-10-12")
    assert cycle == "FRIDAY"
    assert payout_date == "2026-10-16"

    # 2026-10-13 is Tuesday
    cycle, payout_date = get_settlement_cycle("2026-10-13")
    assert cycle == "FRIDAY"
    assert payout_date == "2026-10-16"

    # 2026-10-14 is Wednesday
    cycle, payout_date = get_settlement_cycle("2026-10-14")
    assert cycle == "FRIDAY"
    assert payout_date == "2026-10-16"

    # 2026-10-15 is Thursday
    cycle, payout_date = get_settlement_cycle("2026-10-15")
    assert cycle == "TUESDAY"
    assert payout_date == "2026-10-20"

    # 2026-10-16 is Friday
    cycle, payout_date = get_settlement_cycle("2026-10-16")
    assert cycle == "TUESDAY"
    assert payout_date == "2026-10-20"

    # 2026-10-17 is Saturday
    cycle, payout_date = get_settlement_cycle("2026-10-17")
    assert cycle == "TUESDAY"
    assert payout_date == "2026-10-20"

    # 2026-10-18 is Sunday
    cycle, payout_date = get_settlement_cycle("2026-10-18")
    assert cycle == "TUESDAY"
    assert payout_date == "2026-10-20"


def test_format_payout_date_friendly():
    formatted = format_payout_date_friendly("2026-10-16")
    assert "Friday" in formatted
    assert "Oct 16" in formatted

    formatted_tue = format_payout_date_friendly("2026-10-20")
    assert "Tuesday" in formatted_tue
    assert "Oct 20" in formatted_tue


# -------------------------------------------------------------
# 2. 18% Commission & Net Payable Calculations
# -------------------------------------------------------------
def test_canteen_18_percent_commission_formula():
    """Validates the standard 18.0% take rate and net payout calculation."""
    assert CANTEEN_COMMISSION_RATE == 0.18

    # Scenario 1: ₹1000 gross sales
    gross_sales = 1000.00
    commission = round(gross_sales * CANTEEN_COMMISSION_RATE, 2)
    net_payout = round(gross_sales - commission, 2)
    assert commission == 180.00
    assert net_payout == 820.00

    # Scenario 2: Standard food subtotal
    gross_sales_2 = 350.00
    commission_2 = round(gross_sales_2 * CANTEEN_COMMISSION_RATE, 2)
    net_payout_2 = round(gross_sales_2 - commission_2, 2)
    assert commission_2 == 63.00
    assert net_payout_2 == 287.00


# -------------------------------------------------------------
# 3. Daily Ledger Generation & Persistence
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_generate_daily_canteen_ledger_aggregation():
    """Tests generating a daily canteen ledger with orders aggregation."""
    mock_orders = [
        {
            "_id": "order-1",
            "order_number": "CB-1001",
            "restaurant_id": "rest-taj",
            "restaurant_name": "Taj Canteen",
            "status": "Delivered",
            "base_meal_price": 200.00,
            "delivery_fee": 20.00,
            "platform_tech_fee": 3.00,
            "tip_amount": 10.00,
            "total": 233.00,
            "created_at": "2026-10-14T12:00:00Z",
            "delivered_at": "2026-10-14T12:30:00Z",
            "items": [{"name": "Paneer Biryani", "quantity": 1, "price": 200.00}],
        },
        {
            "_id": "order-2",
            "order_number": "CB-1002",
            "restaurant_id": "rest-taj",
            "restaurant_name": "Taj Canteen",
            "status": "Delivered",
            "pricing_breakdown": {"food_subtotal": 150.00},
            "delivery_fee": 20.00,
            "platform_tech_fee": 3.00,
            "total": 173.00,
            "created_at": "2026-10-14T14:00:00Z",
            "delivered_at": "2026-10-14T14:25:00Z",
            "items": [{"name": "Veg Fried Rice", "quantity": 1, "price": 150.00}],
        },
    ]

    mock_db = {
        "restaurants": AsyncMock(),
        "orders": AsyncMock(),
        "daily_canteen_ledgers": AsyncMock(),
        "canteen_settlements": AsyncMock(),
    }
    mock_db["restaurants"].find_one.return_value = {
        "_id": "rest-taj",
        "name": "Taj Canteen",
        "email": "taj@campusbite.in",
        "settlement_upi_id": "taj@okaxis",
        "phone": "9876543210",
    }
    mock_db["daily_canteen_ledgers"].find_one.return_value = None
    mock_db["daily_canteen_ledgers"].update_one.return_value = MagicMock(upserted_id="ledger_rest-taj_2026-10-14")
    mock_db["orders"].find = lambda *args, **kwargs: AsyncCursorMock(mock_orders)

    with patch("app.services.canteen_ledger_service.database", mock_db), \
         patch("app.services.canteen_ledger_service._get_col", side_effect=lambda name: mock_db.get(name)):

        ledger = await generate_or_get_daily_canteen_ledger("rest-taj", target_date="2026-10-14")

        assert ledger["ledger_id"] == "ledger_rest-taj_2026-10-14"
        assert ledger["canteen_name"] == "Taj Canteen"
        assert ledger["date"] == "2026-10-14"
        assert ledger["metrics"]["total_completed_orders"] == 2
        # Gross pure food sales: 200 + 150 = 350
        assert ledger["metrics"]["gross_food_sales"] == 350.00
        assert ledger["metrics"]["commission_rate"] == 0.18
        # 18% of 350 = 63.00
        assert ledger["metrics"]["commission_amount"] == 63.00
        # Net accrued = 350 - 63 = 287.00
        assert ledger["metrics"]["net_payout_accrued"] == 287.00
        # 2026-10-14 is Wednesday -> cycle day FRIDAY
        assert ledger["settlement_batch"]["cycle_day"] == "FRIDAY"
        assert ledger["settlement_batch"]["scheduled_payout_date"] == "2026-10-16"
        assert ledger["settlement_batch"]["status"] == "QUEUED"


# -------------------------------------------------------------
# 4. Upcoming Disbursal Banner & Settlement Batching
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_get_canteen_upcoming_disbursal_aggregation():
    """Tests aggregating un-settled daily ledgers for the upcoming disbursal banner."""
    mock_unsettled = [
        {
            "ledger_id": "ledger_rest-taj_2026-10-12",
            "date": "2026-10-12",
            "metrics": {
                "total_completed_orders": 5,
                "gross_food_sales": 1000.00,
                "commission_amount": 180.00,
                "net_payout_accrued": 820.00,
            },
            "settlement_batch": {
                "cycle_day": "FRIDAY",
                "scheduled_payout_date": "2026-10-16",
                "status": "QUEUED",
            },
        },
        {
            "ledger_id": "ledger_rest-taj_2026-10-13",
            "date": "2026-10-13",
            "metrics": {
                "total_completed_orders": 3,
                "gross_food_sales": 600.00,
                "commission_amount": 108.00,
                "net_payout_accrued": 492.00,
            },
            "settlement_batch": {
                "cycle_day": "FRIDAY",
                "scheduled_payout_date": "2026-10-16",
                "status": "QUEUED",
            },
        },
    ]

    mock_db = {
        "restaurants": AsyncMock(),
        "orders": AsyncMock(),
        "daily_canteen_ledgers": AsyncMock(),
        "canteen_settlements": AsyncMock(),
    }
    mock_db["restaurants"].find_one.return_value = {
        "_id": "rest-taj",
        "name": "Taj Canteen",
        "email": "taj@campusbite.in",
        "settlement_upi_id": "taj@okaxis",
    }
    mock_db["daily_canteen_ledgers"].find = lambda *args, **kwargs: AsyncCursorMock(mock_unsettled)
    mock_db["daily_canteen_ledgers"].find_one.return_value = None
    mock_db["orders"].find = lambda *args, **kwargs: AsyncCursorMock([])

    with patch("app.services.canteen_ledger_service.database", mock_db), \
         patch("app.services.canteen_ledger_service._get_col", side_effect=lambda name: mock_db.get(name)), \
         patch("app.services.canteen_ledger_service.get_current_ist_date", return_value="2026-10-13"):

        disbursal = await get_canteen_upcoming_disbursal("rest-taj")

        assert disbursal["canteen_name"] == "Taj Canteen"
        assert disbursal["next_disbursal_day"] == "Friday"
        assert disbursal["status_badge"] == "Queued for Bank Disbursal (T+2 Clearance)"
        assert disbursal["accrued_net_earnings"] == 820.00 + 492.00  # 1312.00
        assert disbursal["total_gross_sales"] == 1600.00
        assert disbursal["total_commission_amount"] == 288.00
        assert len(disbursal["pending_ledger_ids"]) == 2
        assert "ledger_rest-taj_2026-10-12" in disbursal["pending_ledger_ids"]


# -------------------------------------------------------------
# 5. Admin Settlement Execution (UTR Recording)
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_settle_payout_batch_execution():
    """Tests admin marking batches as SETTLED with a UTR reference."""
    mock_db = {
        "daily_canteen_ledgers": AsyncMock(),
        "canteen_settlements": AsyncMock(),
        "restaurants": AsyncMock(),
    }
    mock_db["daily_canteen_ledgers"].update_many.return_value = MagicMock(modified_count=2)
    mock_db["daily_canteen_ledgers"].find = lambda *args, **kwargs: AsyncCursorMock([
        {"canteen_id": "rest-taj", "canteen_name": "Taj Canteen", "date": "2026-10-12"},
        {"canteen_id": "rest-taj", "canteen_name": "Taj Canteen", "date": "2026-10-13"},
    ])

    with patch("app.services.canteen_ledger_service.database", mock_db), \
         patch("app.services.canteen_ledger_service._get_col", side_effect=lambda name: mock_db.get(name)):

        res = await settle_payout_batch(
            canteen_id="rest-taj",
            ledger_ids=["ledger_rest-taj_2026-10-12", "ledger_rest-taj_2026-10-13"],
            utr_number="UTR1234567890",
            notes="Bank NEFT Batch Payout Disbursed",
        )

        assert res["success"] is True
        assert res["settled_count"] == 2
        assert res["utr_number"] == "UTR1234567890"
        mock_db["daily_canteen_ledgers"].update_many.assert_called_once()


# -------------------------------------------------------------
# 6. HTTP API Endpoint Verification
# -------------------------------------------------------------
def test_payout_api_endpoints_routing():
    """Validates FastAPI route bindings for canteen and admin payout endpoints."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. GET daily-ledgers
    with patch("app.routes.canteen_payouts.get_canteen_daily_ledgers", new_callable=AsyncMock) as mock_get_ledgers:
        mock_get_ledgers.return_value = {
            "canteen_id": "rest-taj",
            "canteen_name": "Taj Canteen",
            "ledgers": [],
            "total_ledgers": 0,
            "summary": {
                "total_gross_sales": 0.0,
                "total_commission_amount": 0.0,
                "total_net_payout": 0.0,
                "total_completed_orders": 0,
            },
        }

        # Test both /api/v1 prefix and alias
        r1 = client.get("/api/v1/payouts/canteen/rest-taj/daily-ledgers")
        assert r1.status_code == 200
        assert r1.json()["canteen_name"] == "Taj Canteen"

        r2 = client.get("/payouts/canteen/rest-taj/daily-ledgers")
        assert r2.status_code == 200

    # 2. GET upcoming-disbursal
    with patch("app.routes.canteen_payouts.get_canteen_upcoming_disbursal", new_callable=AsyncMock) as mock_disbursal:
        mock_disbursal.return_value = {
            "canteen_id": "rest-taj",
            "canteen_name": "Taj Canteen",
            "next_disbursal_date": "2026-10-16",
            "next_disbursal_day": "Friday",
            "formatted_payout_date": "Friday, Oct 16",
            "accrued_net_balance": 1500.00,
            "accrued_net_earnings": 1500.00,
            "total_gross_sales": 1829.27,
            "commission_rate": 0.18,
            "total_commission_amount": 329.27,
            "status_badge": "Queued for Bank Disbursal (T+2 Clearance)",
            "status": "QUEUED",
            "pending_ledger_ids": ["ledger_rest-taj_2026-10-14"],
            "daily_ledgers_count": 1,
        }

        r3 = client.get("/api/v1/payouts/canteen/rest-taj/upcoming-disbursal")
        assert r3.status_code == 200
        data = r3.json()
        assert data["next_disbursal_day"] == "Friday"
        assert data["accrued_net_balance"] == 1500.00
        assert data["status_badge"] == "Queued for Bank Disbursal (T+2 Clearance)"

        r4 = client.get("/payouts/canteen/rest-taj/upcoming-disbursal")
        assert r4.status_code == 200

    # 3. POST admin settle-batch
    with patch("app.routes.canteen_payouts.settle_payout_batch", new_callable=AsyncMock) as mock_settle:
        mock_settle.return_value = {
            "success": True,
            "message": "Successfully settled 1 daily ledger(s)",
            "settled_count": 1,
            "utr_number": "UTR9988776655",
            "settled_at": "2026-10-15T12:00:00Z",
        }

        payload = {
            "canteen_id": "rest-taj",
            "utr_number": "UTR9988776655",
            "notes": "Verified NEFT Clearance",
        }
        r5 = client.post("/api/v1/admin/payouts/settle-batch", json=payload)
        assert r5.status_code == 200
        assert r5.json()["success"] is True
        assert r5.json()["utr_number"] == "UTR9988776655"

