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
