from app.routes.orders import normalize_order_financials
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
