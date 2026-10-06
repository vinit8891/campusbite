"""Unit tests for Admin financial analytics and GMV aggregation."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from app.models.analytics import get_admin_financial_analytics


class MockAsyncCursor:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._iter = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


@pytest.mark.asyncio
async def test_admin_financial_analytics_empty_orders():
    """When no orders have been delivered, financial analytics returns zeroes."""
    mock_collection = AsyncMock()
    mock_collection.find = lambda query: MockAsyncCursor([])

    with patch("app.models.analytics.order_collection", mock_collection):
        analytics = await get_admin_financial_analytics()

        assert analytics["total_revenue"] == 0.0
        assert analytics["platform_earnings"] == 0.0
        assert analytics["total_orders"] == 0
        assert analytics["restaurant_settlements"] == 0.0
        assert analytics["courier_payouts"] == 0.0
        assert analytics["gst_pool"] == 0.0
        assert analytics["average_order_value"] == 0.0


@pytest.mark.asyncio
async def test_admin_financial_analytics_multiple_delivered_orders():
    """Aggregates GMV, tech fees, commissions, settlements, payouts, and GST correctly."""
    delivered_orders = [
        # Order 1: 1 budget meal @ ₹80 + ₹4 GST + ₹15 delivery + ₹3 platform fee = ₹102 total
        # Commission: 5% of 80 = ₹4.00, Tech fee = ₹3.00 -> Platform earnings = ₹7.00
        # Restaurant settlement: 80 - 4 = ₹76.00
        # Courier payout: ₹15.00, GST pool: ₹4.00
        {
            "status": "Delivered",
            "total": 102.0,
            "food_subtotal": 80.0,
            "restaurant_gst": 4.0,
            "platform_fee": 3.0,
            "delivery_fee": 15.0,
            "commission_amount": 4.0,
            "items": [
                {"name": "Mini Thali", "price": 80.0, "quantity": 1, "is_budget_meal": True}
            ],
        },
        # Order 2: 2 standard meals @ ₹150 (₹300 subtotal) + ₹15 GST + ₹40 delivery + ₹5 platform fee = ₹360 total
        # Commission: 10% of 300 = ₹30.00, Tech fee = ₹5.00 -> Platform earnings = ₹35.00
        # Restaurant settlement: 300 - 30 = ₹270.00
        # Courier payout: ₹40.00, GST pool: ₹15.00
        {
            "status": "Delivered",
            "total": 360.0,
            "food_subtotal": 300.0,
            "restaurant_gst": 15.0,
            "platform_fee": 5.0,
            "delivery_fee": 40.0,
            "commission_amount": 30.0,
            "items": [
                {"name": "Biryani Combo", "price": 150.0, "quantity": 2, "is_budget_meal": False}
            ],
        },
    ]

    mock_collection = AsyncMock()
    mock_collection.find = lambda query: MockAsyncCursor(delivered_orders)

    with patch("app.models.analytics.order_collection", mock_collection):
        analytics = await get_admin_financial_analytics()

        # GMV = 102 + 360 = 462.00
        assert analytics["total_revenue"] == 462.00
        # Platform earnings = 7 + 35 = 42.00
        assert analytics["platform_earnings"] == 42.00
        # Total delivered orders
        assert analytics["total_orders"] == 2
        # Restaurant settlements = 76 + 270 = 346.00
        assert analytics["restaurant_settlements"] == 346.00
        # Courier payouts = 15 + 40 = 55.00
        assert analytics["courier_payouts"] == 55.00
        # GST pool = 4 + 15 = 19.00
        assert analytics["gst_pool"] == 19.00
        # AOV = 462 / 2 = 231.00
        assert analytics["average_order_value"] == 231.00
        assert analytics["total_small_order_fees"] == 0.0
        assert analytics["small_order_count"] == 0


@pytest.mark.asyncio
async def test_admin_financial_analytics_with_small_order_surcharge():
    """Verifies that small order fees (<₹50 delivery surcharge) are accumulated into platform earnings."""
    delivered_orders = [
        # Order 1: Small cart (₹40 food subtotal < ₹50) + ₹5 small order fee + ₹2 GST + ₹15 delivery + ₹3 platform fee = ₹65 total
        # Commission: 18% of 40 = ₹7.20, Tech fee = ₹3.00, Small order fee = ₹5.00 -> Platform earnings = 7.20 + 3.00 + 5.00 = ₹15.20
        # Restaurant settlement: 40 - 7.20 = ₹32.80
        # Courier payout: ₹15.00, GST pool: ₹2.00
        {
            "status": "Delivered",
            "total": 65.0,
            "food_subtotal": 40.0,
            "restaurant_gst": 2.0,
            "platform_fee": 3.0,
            "small_order_fee": 5.0,
            "delivery_fee": 15.0,
            "commission_amount": 7.20,
            "items": [
                {"name": "Tea & Bun Maska", "price": 40.0, "quantity": 1}
            ],
        },
        # Order 2: Standard cart (₹120 food subtotal >= ₹50) -> small_order_fee = 0
        # Commission: 18% of 120 = ₹21.60, Tech fee = ₹5.00 -> Platform earnings = 21.60 + 5.00 = ₹26.60
        {
            "status": "Delivered",
            "total": 145.0,
            "food_subtotal": 120.0,
            "restaurant_gst": 6.0,
            "platform_fee": 5.0,
            "small_order_fee": 0.0,
            "delivery_fee": 15.0,
            "commission_amount": 21.60,
            "items": [
                {"name": "Thali", "price": 120.0, "quantity": 1}
            ],
        },
    ]

    mock_collection = AsyncMock()
    mock_collection.find = lambda query: MockAsyncCursor(delivered_orders)

    with patch("app.models.analytics.order_collection", mock_collection):
        analytics = await get_admin_financial_analytics()

        # GMV = 65 + 145 = 210.00
        assert analytics["total_revenue"] == 210.00
        # Platform earnings = 15.20 + 26.60 = 41.80
        assert analytics["platform_earnings"] == 41.80
        # Small order fees total and count
        assert analytics["total_small_order_fees"] == 5.00
        assert analytics["small_order_count"] == 1
        assert analytics["total_orders"] == 2


@pytest.mark.asyncio
async def test_canteen_settlement_summary_excludes_delivery_and_rider_wages():
    """
    Asserts that the 9:00 PM Canteen Settlement engine calculates:
    gross_food_sales = sum(item_subtotals)
    gst_collected = 5% of gross_food_sales
    platform_commission = 18% of gross_food_sales
    net_canteen_payable = gross + 5% GST - 18% Commission (87% of Gross)
    and strictly excludes delivery fees (₹15/₹40), tech fees (₹3/₹5), and courier tips.
    """
    from app.services.settlement_service import (
        calculate_canteen_daily_settlement,
        get_daily_canteen_settlement_summary,
    )

    mock_orders = [
        {
            "_id": "order-1",
            "restaurant_email": "taj@campusbite.in",
            "restaurant_name": "Taj Canteen",
            "status": "Delivered",
            "food_subtotal": 200.0,
            "restaurant_gst": 10.0,
            "delivery_fee": 15.0,
            "platform_fee": 3.0,
            "tip_amount": 10.0,
            "delivery_partner_earning": 30.0,  # ₹20 base + ₹10 tip
            "total": 238.0,
            "created_at": "2026-10-06T12:00:00Z",
            "delivered_at": "2026-10-06T12:30:00Z",
            "items": [{"name": "Paneer Butter Masala", "price": 200.0, "quantity": 1}],
        },
        {
            "_id": "order-2",
            "restaurant_email": "taj@campusbite.in",
            "restaurant_name": "Taj Canteen",
            "status": "Delivered",
            "food_subtotal": 300.0,
            "restaurant_gst": 15.0,
            "delivery_fee": 40.0,
            "platform_fee": 5.0,
            "tip_amount": 0.0,
            "delivery_partner_earning": 20.0,
            "total": 360.0,
            "created_at": "2026-10-06T14:00:00Z",
            "delivered_at": "2026-10-06T14:45:00Z",
            "items": [{"name": "Chicken Biryani Combo", "price": 150.0, "quantity": 2}],
        },
    ]

    mock_restaurants = [
        {
            "_id": "rest-taj",
            "email": "taj@campusbite.in",
            "name": "Taj Canteen",
            "upi_id": "tajcanteen@okaxis",
            "bank_account": "9876543210",
            "ifsc": "HDFC0001234",
        }
    ]

    mock_db = {
        "restaurants": AsyncMock(),
        "canteen_settlements": AsyncMock(),
        "orders": AsyncMock(),
    }

    mock_db["restaurants"].find_one = AsyncMock(return_value=mock_restaurants[0])
    mock_db["restaurants"].find = lambda query: MockAsyncCursor(mock_restaurants)
    mock_db["canteen_settlements"].find_one = AsyncMock(return_value=None)
    mock_db["orders"].find = lambda query: MockAsyncCursor(mock_orders)

    async def mock_distinct(field):
        return ["taj@campusbite.in"]

    mock_db["orders"].distinct = mock_distinct

    with patch("app.services.settlement_service.database", mock_db):
        settlement = await calculate_canteen_daily_settlement(
            restaurant_email="taj@campusbite.in",
            target_date="2026-10-06",
        )

        # Gross Food Sales must only be ₹200 + ₹300 = ₹500 (Delivery fee ₹55, tech fee ₹8, tip ₹10 excluded)
        assert settlement["gross_food_sales"] == 500.00
        # 5% GST = ₹25.00
        assert settlement["gst_collected"] == 25.00
        # 18% Platform Commission = ₹90.00
        assert settlement["platform_commission"] == 90.00
        # Net Canteen Payable = 500 + 25 - 90 = ₹435.00
        assert settlement["net_canteen_payable"] == 435.00
        assert settlement["orders_count"] == 2
        assert settlement["upi_id"] == "tajcanteen@okaxis"
        assert settlement["bank_details"]["account_number"] == "9876543210"

        # Summary endpoint aggregation
        summary = await get_daily_canteen_settlement_summary(target_date="2026-10-06")
        assert summary["total_gross_food_sales"] == 500.00
        assert summary["total_gst_collected"] == 25.00
        assert summary["total_platform_commission"] == 90.00
        assert summary["total_net_payable"] == 435.00
        assert summary["total_orders"] == 2

