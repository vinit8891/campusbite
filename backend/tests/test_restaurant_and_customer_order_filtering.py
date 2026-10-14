"""Tests for restaurant & customer order filtering:
- Excludes unpaid/processing online orders from restaurant queries
- Excludes cancelled orders when requested
- Permits COD and paid/completed online orders
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import create_access_token
from app.auth.roles import RESTAURANT_OWNER
from app.models.order import get_restaurant_orders


class MockAsyncCursor:
    """Helper to mock MongoDB async cursors for order queries."""
    def __init__(self, docs):
        self.docs = docs
        self.index = 0

    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def __aiter__(self):
        self.index = 0
        return self

    async def __anext__(self):
        if self.index < len(self.docs):
            doc = self.docs[self.index]
            self.index += 1
            return doc
        raise StopAsyncIteration


@pytest.mark.asyncio
async def test_get_restaurant_orders_filters_unpaid_online():
    """Ensure orders with payment_method === 'online' are ONLY shown if payment_status is 'PAID' or 'COMPLETED'."""
    rest_email = "canteen@campus.edu"
    test_docs = [
        # 1. COD pending order -> SHOULD BE INCLUDED
        {
            "_id": ObjectId(),
            "restaurant_email": rest_email,
            "status": "Pending",
            "payment_method": "cod",
            "payment_status": "pending",
            "total": 100.0,
            "created_at": datetime.now(UTC),
        },
        # 2. Online paid order -> SHOULD BE INCLUDED
        {
            "_id": ObjectId(),
            "restaurant_email": rest_email,
            "status": "Accepted",
            "payment_method": "online",
            "payment_status": "paid",
            "total": 150.0,
            "created_at": datetime.now(UTC),
        },
        # 3. Online completed order -> SHOULD BE INCLUDED
        {
            "_id": ObjectId(),
            "restaurant_email": rest_email,
            "status": "Preparing",
            "payment_method": "online",
            "payment_status": "completed",
            "total": 200.0,
            "created_at": datetime.now(UTC),
        },
        # 4. Online processing order -> MUST BE EXCLUDED
        {
            "_id": ObjectId(),
            "restaurant_email": rest_email,
            "status": "Pending",
            "payment_method": "online",
            "payment_status": "processing",
            "total": 120.0,
            "created_at": datetime.now(UTC),
        },
        # 5. Online waiting confirmation order -> MUST BE EXCLUDED
        {
            "_id": ObjectId(),
            "restaurant_email": rest_email,
            "status": "Pending",
            "payment_method": "online",
            "payment_status": "waiting for online payment confirmation",
            "total": 180.0,
            "created_at": datetime.now(UTC),
        },
        # 6. Online pending order -> MUST BE EXCLUDED
        {
            "_id": ObjectId(),
            "restaurant_email": rest_email,
            "status": "Pending",
            "payment_method": "online",
            "payment_status": "pending",
            "total": 90.0,
            "created_at": datetime.now(UTC),
        },
        # 7. Cancelled order -> EXCLUDED when exclude_cancelled=True
        {
            "_id": ObjectId(),
            "restaurant_email": rest_email,
            "status": "Cancelled",
            "payment_method": "cod",
            "payment_status": "pending",
            "total": 80.0,
            "created_at": datetime.now(UTC),
        },
    ]

    with patch("app.models.order.order_collection") as mock_col:
        mock_col.find.return_value = MockAsyncCursor([dict(d) for d in test_docs])

        # Query with exclude_cancelled=True
        results = await get_restaurant_orders(rest_email, exclude_cancelled=True)

        returned_totals = [o["total"] for o in results]
        # Only order 1 (100.0), order 2 (150.0), and order 3 (200.0) should be returned
        assert 100.0 in returned_totals
        assert 150.0 in returned_totals
        assert 200.0 in returned_totals

        # Processing, pending, waiting confirmation online orders MUST NOT be returned
        assert 120.0 not in returned_totals
        assert 180.0 not in returned_totals
        assert 90.0 not in returned_totals

        # Cancelled order MUST NOT be returned
        assert 80.0 not in returned_totals
        assert len(results) == 3


def test_restaurant_orders_endpoint_excludes_cancelled_param():
    """Verify GET /orders/restaurant/{email}?exclude_cancelled=true passes parameter."""
    client = TestClient(app)
    rest_email = "chef@campusbite.com"
    token = create_access_token(
        data={
            "sub": "chef_123",
            "email": rest_email,
            "role": RESTAURANT_OWNER,
        }
    )
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.routes.order.get_restaurant_orders", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = [
            {
                "_id": str(ObjectId()),
                "restaurant_email": rest_email,
                "status": "Accepted",
                "payment_method": "online",
                "payment_status": "paid",
                "total": 150.0,
            }
        ]

        resp = client.get(
            f"/orders/restaurant/{rest_email}?exclude_cancelled=true",
            headers=headers,
        )

        assert resp.status_code == 200
        mock_get.assert_called_once_with(
            rest_email,
            status=None,
            payment_status=None,
            payment_method=None,
            exclude_cancelled=True,
            q=None,
            limit=50,
        )
