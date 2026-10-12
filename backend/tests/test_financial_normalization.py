from app.routes.orders import (
    calculate_order_financials,
    normalize_order_financials,
)
from app.routes.settlements import normalize_settlement_financials
from app.routes.courier import normalize_courier_financials


def test_order_financial_normalization_defaults():
    order = {"_id": "123", "status": "Pending"}
    normalized = normalize_order_financials(order)

    assert isinstance(normalized["items_subtotal"], float)
    assert isinstance(normalized["gst"], float)
    assert isinstance(normalized["delivery_fee"], float)
    assert isinstance(normalized["platform_fee"], float)
    assert isinstance(normalized["commission_amount"], float)
    assert isinstance(normalized["net_payout"], float)
    assert isinstance(normalized["total_amount"], float)

    assert normalized["items_subtotal"] == 0.0
    assert normalized["gst"] == 0.0
    assert normalized["delivery_fee"] == 0.0
    assert normalized["platform_fee"] == 0.0
    assert normalized["commission_amount"] == 0.0
    assert normalized["net_payout"] == 0.0
    assert normalized["total_amount"] == 0.0

    # Ensure array defaults exist and prevent .length crashes
    assert isinstance(normalized["items"], list)
    assert isinstance(normalized["timeline"], list)
    assert isinstance(normalized["status_history"], list)


def test_order_normalization_preserves_all_fields_and_guarantees_arrays():
    order = {
        "_id": "order_789",
        "customer": {"name": "Test Student", "email": "student@zeal.edu"},
        "restaurant": {"name": "Zeal Canteen", "address": "Campus Ground"},
        "delivery_address": "Hostel B Room 301",
        "items": [{"id": "item1", "name": "Vada Pav", "price": 20.0, "quantity": 2}],
        "timeline": [{"status": "Placed", "time": "12:00 PM"}],
        "status_history": ["Placed"],
        "customer_name": "Test Student",
    }
    normalized = normalize_order_financials(order)

    # Verify all non-financial fields are preserved
    assert normalized["_id"] == "order_789"
    assert normalized["customer"]["name"] == "Test Student"
    assert normalized["restaurant"]["name"] == "Zeal Canteen"
    assert normalized["delivery_address"] == "Hostel B Room 301"
    assert normalized["customer_name"] == "Test Student"
    assert len(normalized["items"]) == 1
    assert len(normalized["timeline"]) == 1
    assert len(normalized["status_history"]) == 1


def test_calculate_order_financials():
    items = [
        {"id": "item1", "name": "Burger", "price": 100.0, "quantity": 2},
        {"id": "item2", "name": "Fries", "price": 22.0, "quantity": 2},
    ]
    fin = calculate_order_financials(items, delivery_fee=15.0, platform_fee=3.0)

    # 100*2 + 22*2 = 244.00
    assert fin["items_subtotal"] == 244.00
    assert fin["gst"] == 12.20  # 5% of 244
    assert fin["delivery_fee"] == 15.0
    assert fin["platform_fee"] == 3.0
    assert fin["total_amount"] == 274.20  # 244 + 12.20 + 15 + 3
    assert fin["commission_amount"] == 43.92  # 18% of 244


def test_order_subtotal_pricing_mismatch_correction():
    """Ensure normalize_order_financials overrides mismatched frontend subtotal with precise items sum."""
    order = {
        "_id": "order_mismatch_244",
        "items": [
            {"id": "item1", "name": "Burger", "price": 100.0, "quantity": 2},
            {"id": "item2", "name": "Fries", "price": 22.0, "quantity": 2},
        ],
        "items_subtotal": 190.00,  # Mismatched/stale frontend subtotal
        "delivery_fee": 15.0,
        "platform_fee": 3.0,
    }
    normalized = normalize_order_financials(order)

    # Must be corrected dynamically to the precise sum of items: ₹244.00
    assert normalized["items_subtotal"] == 244.00
    assert normalized["gst"] == 12.20
    assert normalized["delivery_fee"] == 15.0
    assert normalized["platform_fee"] == 3.0


def test_order_financial_normalization_from_items():
    order = {
        "_id": "order_456",
        "items": [
            {"id": "item1", "price": 100.0, "quantity": 2},
            {"id": "item2", "price": 50.0, "quantity": 1},
        ],
        "delivery_fee": 15.0,
        "platform_fee": 3.0,
    }
    normalized = normalize_order_financials(order)

    assert normalized["items_subtotal"] == 250.0
    assert normalized["gst"] == 12.50
    assert normalized["delivery_fee"] == 15.0
    assert normalized["platform_fee"] == 3.0
    assert normalized["commission_amount"] == 45.0  # 18% of 250
    assert normalized["net_payout"] == 205.0  # 250 - 45
    assert normalized["total_amount"] == 280.50  # 250 + 12.5 + 15 + 3


def test_settlement_financial_normalization_defaults():
    settlement = {"restaurant_id": "rest_1"}
    normalized = normalize_settlement_financials(settlement)

    assert isinstance(normalized["items_subtotal"], float)
    assert isinstance(normalized["gst"], float)
    assert isinstance(normalized["delivery_fee"], float)
    assert isinstance(normalized["platform_fee"], float)
    assert isinstance(normalized["commission_amount"], float)
    assert isinstance(normalized["net_payout"], float)
    assert isinstance(normalized["total_amount"], float)


def test_courier_financial_normalization_defaults():
    courier = {"name": "Rider 1", "phone": "9876543210"}
    normalized = normalize_courier_financials(courier)

    assert isinstance(normalized["items_subtotal"], float)
    assert isinstance(normalized["gst"], float)
    assert isinstance(normalized["delivery_fee"], float)
    assert isinstance(normalized["platform_fee"], float)
    assert isinstance(normalized["commission_amount"], float)
    assert isinstance(normalized["net_payout"], float)
    assert isinstance(normalized["total_amount"], float)
