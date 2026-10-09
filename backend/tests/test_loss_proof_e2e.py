"""Comprehensive End-to-End Financial & Operational Smoke Test Suite.

Verifies:
1. Subtotal validation rejects delivery orders < ₹35 with 400 Bad Request & allows takeaway.
2. Dynamic platform tech fee tiering (₹5 for carts < ₹50, ₹3 for carts >= ₹50).
3. Courier CIH limit guard rejects order claiming when net_cash_due >= ₹500 with 403 Forbidden.
4. Calibrated batch wage accrual (₹20 primary drop + ₹10 secondary/add-on drop).
5. Admin financial analytics, commissions, and self-funding delivery pool reconciliation.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import create_access_token
from app.auth.roles import CUSTOMER, DELIVERY_PARTNER, ADMIN
from app.payments.amounts import (
    calculate_order_amounts,
    calculate_rider_payout,
    calculate_batch_rider_earnings,
    MIN_DELIVERY_SUBTOTAL,
    SMALL_CART_THRESHOLD,
    PLATFORM_FEE_SMALL_CART,
    PLATFORM_FEE_STANDARD,
    BATCH_DELIVERY_FEE,
    RIDER_BASE_PAYOUT,
    RIDER_BATCH_ADDON_PAYOUT,
    MAX_UNREMITTED_CASH_LIMIT,
)
from app.models.analytics import get_admin_financial_analytics


class MockAsyncCursor:
    """Mock async cursor for Motor MongoDB collections."""
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


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def customer_auth_headers():
    token = create_access_token({
        "sub": "cust_smoke_123",
        "email": "customer.smoke@campusbite.in",
        "full_name": "Smoke Student",
        "phone": "9876500001",
        "role": CUSTOMER,
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def courier_auth_headers():
    token = create_access_token({
        "sub": "del_smoke_456",
        "email": "courier.smoke@campusbite.in",
        "name": "Smoke Courier",
        "phone": "9876500002",
        "role": DELIVERY_PARTNER,
    })
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# Scenario 1: Cart Minimum & Takeaway Exemption
# ==============================================================================

def test_subtotal_validation_rejects_delivery_below_35_with_400(client, customer_auth_headers):
    """Delivery orders with subtotal < ₹35 must be rejected with HTTP 400."""
    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Smoke Student",
        "phone": "9876500001",
        "address": "Tagore Hostel Room 101",
        "delivery_type": "HOSTEL_BATCH",
        "order_type": "DELIVERY",
        "hostel_block": "Tagore Hostel",
        "payment_method": "COD",
        "items": [
            {"id": "tea_1", "name": "Cutting Chai", "price": 20.0, "quantity": 1}
        ],
        "total": 41.0,  # 20 + 1.0 GST + 15 delivery + 5 tech fee = 41.0
    }

    resp = client.post("/orders", json=payload, headers=customer_auth_headers)
    assert resp.status_code == 400
    assert "Minimum delivery subtotal is ₹35.00" in resp.json()["detail"]


def test_subtotal_validation_allows_takeaway_below_35(client, customer_auth_headers):
    """Counter Takeaway orders with subtotal < ₹35 are exempt from the minimum barrier."""
    # Counter price ₹20 -> Calibrated app subtotal = ceil(20 / 0.82) = 25.0 (< 35)
    pricing = calculate_order_amounts(
        items=[{"id": "tea_1", "name": "Cutting Chai", "price": 20.0, "quantity": 1}],
        delivery_type="COUNTER_TAKEAWAY",
        payment_method="COD",
    )
    assert pricing["app_subtotal"] == 25.0
    assert pricing["is_below_min_delivery"] is False
    assert pricing["delivery_fee"] == 0.00
    assert pricing["platform_fee"] == 5.00
    assert pricing["total_payable"] == 31.00  # 25 + 1.25 GST + 5.0 fee = 31.25 -> COD rounded 31.0

    payload = {
        "restaurant_email": "canteen@campus.in",
        "customer_name": "Smoke Student",
        "phone": "9876500001",
        "address": "Counter Pickup",
        "delivery_type": "COUNTER_TAKEAWAY",
        "order_type": "TAKEAWAY",
        "payment_method": "COD",
        "items": [
            {"id": "tea_1", "name": "Cutting Chai", "price": 20.0, "quantity": 1}
        ],
        "total": 31.0,
    }

    test_oid = str(ObjectId())

    with patch("app.routes.order.create_order", AsyncMock(return_value=test_oid)), \
         patch("app.routes.order.schedule_notification", MagicMock()):
        resp = client.post("/orders", json=payload, headers=customer_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Order placed successfully"
        assert data["id"] == test_oid
        assert data["total"] == 31.0


# ==============================================================================
# Scenario 2: Dynamic Platform Tech Fee Tiering
# ==============================================================================

def test_dynamic_platform_tech_fee_tiering():
    """
    Subtotal < ₹50 -> ₹5.00 Tech Fee
    Subtotal >= ₹50 -> ₹3.00 Tech Fee
    """
    # 1. Counter price ₹34 -> Calibrated subtotal ₹42 (< ₹50)
    small_cart = calculate_order_amounts(
        items=[{"id": "item1", "name": "Snack", "price": 34.0, "quantity": 1}],
        delivery_type="HOSTEL_BATCH",
        payment_method="ONLINE",
    )
    assert small_cart["app_subtotal"] == 42.0
    assert small_cart["platform_fee"] == PLATFORM_FEE_SMALL_CART  # ₹5.00
    assert small_cart["gst_amount"] == 2.10  # 5% of 42
    assert small_cart["delivery_fee"] == 15.00
    assert small_cart["total_payable"] == 64.10  # 42 + 2.10 + 15 + 5

    # 2. Counter price ₹80 -> Calibrated subtotal ₹98 (>= ₹50)
    large_cart = calculate_order_amounts(
        items=[{"id": "item2", "name": "Meal Combo", "price": 80.0, "quantity": 1}],
        delivery_type="HOSTEL_BATCH",
        payment_method="ONLINE",
    )
    assert large_cart["app_subtotal"] == 98.0
    assert large_cart["platform_fee"] == PLATFORM_FEE_STANDARD  # ₹3.00
    assert large_cart["gst_amount"] == 4.90  # 5% of 98
    assert large_cart["delivery_fee"] == 15.00
    assert large_cart["total_payable"] == 120.90  # 98 + 4.90 + 15 + 3


# ==============================================================================
# Scenario 3: Courier CIH Limit Lockout Guard (>= ₹500 blocks claim)
# ==============================================================================

def test_courier_claim_rejected_when_cih_exceeds_500(client, courier_auth_headers):
    """Courier with net unremitted cash >= ₹500 is blocked with 403 Forbidden."""
    test_oid = ObjectId()
    test_order_id = str(test_oid)

    available_order = {
        "_id": test_oid,
        "status": "Ready for Pickup",
        "delivery_type": "HOSTEL_BATCH",
        "total": 120.90,
    }

    # Courier state: Collected ₹604.50, Earned ₹100.00 -> Net Due = ₹504.50 (>= ₹500)
    locked_courier_doc = {
        "phone": "9876500002",
        "name": "Smoke Courier",
        "unremitted_cod_balance": 604.50,
        "total_payout_earned": 100.00,
        "total_remitted": 0.0,
    }

    mock_db = MagicMock()
    mock_db["orders"].count_documents = AsyncMock(return_value=0)

    with patch("app.routes.order.database", mock_db), \
         patch("app.routes.order.get_order_by_id", AsyncMock(return_value=available_order)), \
         patch("app.routes.order.get_delivery_partner_by_phone", AsyncMock(return_value=locked_courier_doc)):

        resp = client.post(
            f"/orders/delivery/claim-order/{test_order_id}",
            headers=courier_auth_headers,
        )
        assert resp.status_code == 403
        assert "Cash-in-hand limit reached" in resp.json()["detail"]


def test_courier_claim_allowed_when_cih_below_500(client, courier_auth_headers):
    """Courier with net unremitted cash < ₹500 is allowed to claim order."""
    test_oid = ObjectId()
    test_order_id = str(test_oid)

    available_order = {
        "_id": test_oid,
        "status": "Ready for Pickup",
        "delivery_type": "HOSTEL_BATCH",
        "total": 120.90,
    }

    # Courier state: Collected ₹240.00, Earned ₹60.00 -> Net Due = ₹180.00 (< ₹500)
    active_courier_doc = {
        "phone": "9876500002",
        "name": "Smoke Courier",
        "unremitted_cod_balance": 240.00,
        "total_payout_earned": 60.00,
        "total_remitted": 0.0,
    }

    mock_db = MagicMock()
    mock_db["orders"].count_documents = AsyncMock(return_value=0)

    with patch("app.routes.order.database", mock_db), \
         patch("app.routes.order.get_order_by_id", AsyncMock(return_value=available_order)), \
         patch("app.routes.order.get_delivery_partner_by_phone", AsyncMock(return_value=active_courier_doc)), \
         patch("app.routes.order.assign_delivery_partner", AsyncMock(return_value=True)), \
         patch("app.routes.order.schedule_notification", MagicMock()):

        resp = client.post(
            f"/orders/delivery/claim-order/{test_order_id}",
            headers=courier_auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["message"] == "Order accepted successfully"


# ==============================================================================
# Scenario 4: Calibrated Batch Wage Accrual & Earnings Dashboard
# ==============================================================================

def test_batch_wage_calculation_formula():
    """Validates calibrated drop payouts: Drop 1 = ₹20, Drop 2+ = ₹14."""
    drop1 = calculate_rider_payout(is_batch_addon=False, tip_amount=0.0)
    drop2 = calculate_rider_payout(is_batch_addon=True, tip_amount=0.0)
    assert drop1 == RIDER_BASE_PAYOUT  # ₹20.00
    assert drop2 == RIDER_BATCH_ADDON_PAYOUT  # ₹14.00

    # 2-order batch: 20 + 14 = 34.00
    assert calculate_batch_rider_earnings(2, total_tips=0.0) == 34.00
    # 3-order batch: 20 + 14 + 14 = 48.00
    assert calculate_batch_rider_earnings(3, total_tips=0.0) == 48.00
    # 2-order batch with ₹15 tips: 34 + 15 = 49.00
    assert calculate_batch_rider_earnings(2, total_tips=15.0) == 49.00


@pytest.mark.asyncio
async def test_delivery_dashboard_stats_aggregates_batch_wages():
    """Verifies /delivery-dashboard/stats aggregates completed batch orders correctly."""
    courier_phone = "9876500002"
    batch_cluster_id = "BATCH_HOSTEL_SMOKE_77"

    # 2 Delivered orders sharing the same batch_id
    delivered_orders = [
        {
            "_id": ObjectId(),
            "status": "Delivered",
            "batch_id": batch_cluster_id,
            "total": 120.0,
            "payment_method": "COD",
            "delivery_partner": {"phone": courier_phone, "accepted_at": datetime.now(UTC)},
            "created_at": datetime.now(UTC),
            "delivered_at": datetime.now(UTC),
        },
        {
            "_id": ObjectId(),
            "status": "Delivered",
            "batch_id": batch_cluster_id,
            "total": 150.0,
            "payment_method": "COD",
            "delivery_partner": {"phone": courier_phone, "accepted_at": datetime.now(UTC)},
            "created_at": datetime.now(UTC),
            "delivered_at": datetime.now(UTC),
        },
    ]

    mock_db = MagicMock()
    mock_orders_collection = MagicMock()
    mock_orders_collection.find = lambda query: MagicMock(sort=lambda field, order: MockAsyncCursor(delivered_orders))
    mock_db["orders"] = mock_orders_collection
    mock_db["delivery_partners"].find_one = AsyncMock(return_value={"phone": courier_phone, "total_remitted": 0.0})

    with patch("app.routes.delivery_dashboard.database", mock_db), \
         patch("app.routes.delivery_dashboard.orders", mock_orders_collection):

        from app.routes.delivery_dashboard import delivery_stats
        user_context = {"phone": courier_phone, "role": DELIVERY_PARTNER}
        stats = await delivery_stats(phone=courier_phone, current_user=user_context)

        assert stats["completed"] == 2
        # Drop 1 gets ₹20, Drop 2 gets ₹14 -> Total Earnings = ₹34.00
        assert stats["earnings"] == 34.00
        # Total COD collected = 120 + 150 = ₹270.00
        assert stats["cash_in_hand"] == 270.00
        assert stats["cash_reconciliation"]["total_cod_collected"] == 270.00
        # Net Cash Due = 270 - 34 = ₹236.00
        assert stats["net_cash_due"] == 236.00
        assert stats["is_locked"] is False


# ==============================================================================
# Scenario 5: Admin Financial Analytics & Delivery Pool Reconciliation
# ==============================================================================

@pytest.mark.asyncio
async def test_admin_financial_analytics_and_pool_reconciliation():
    """
    Verifies admin financial aggregation:
    - 2 Delivered batch orders (₹15 delivery fee each = ₹30 total collected)
    - Courier payout for 2-order batch: ₹30.00
    - Delivery pool differential: 30 - 30 = ₹0.00 (100% self-funding)
    """
    batch_id = "BATCH_TAGORE_RECON_88"
    delivered_orders = [
        {
            "status": "Delivered",
            "total": 120.90,
            "food_subtotal": 98.0,
            "restaurant_gst": 4.90,
            "platform_fee": 3.0,
            "delivery_fee": 15.0,
            "commission_amount": 17.64,  # 18% of 98
            "batch_id": batch_id,
            "is_batch_addon": False,
            "items": [{"name": "Rice Thali", "price": 98.0, "quantity": 1}],
        },
        {
            "status": "Delivered",
            "total": 120.90,
            "food_subtotal": 98.0,
            "restaurant_gst": 4.90,
            "platform_fee": 3.0,
            "delivery_fee": 15.0,
            "commission_amount": 17.64,  # 18% of 98
            "batch_id": batch_id,
            "is_batch_addon": True,
            "items": [{"name": "Rice Thali", "price": 98.0, "quantity": 1}],
        },
    ]

    mock_collection = AsyncMock()
    mock_collection.find = lambda query: MockAsyncCursor(delivered_orders)

    with patch("app.models.analytics.order_collection", mock_collection):
        analytics = await get_admin_financial_analytics()

        # GMV = 120.90 * 2 = 241.80
        assert analytics["total_revenue"] == 241.80
        assert analytics["total_orders"] == 2

        # Courier payouts: Drop 1 (₹20) + Drop 2 (₹10) = ₹30.00
        assert analytics["courier_payouts"] == 30.00

        # Delivery fees collected: 2 * 15 = ₹30.00
        # Delivery pool differential = 30.00 - 30.00 = 0.00 (100% self-funding!)
        delivery_pool_differential = (2 * BATCH_DELIVERY_FEE) - analytics["courier_payouts"]
        assert delivery_pool_differential == 0.00

        # Platform earnings = Commissions (17.64 * 2 = 35.28) + Tech fees (3.00 * 2 = 6.00) = 41.28
        assert analytics["platform_earnings"] == 41.28
