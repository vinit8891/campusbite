"""Courier wage and batch compensation service.

Authoritative compensation rules:
- 1st order of any trip/batch: ₹20.00 base guaranteed wage.
- Subsequent bundled orders in the same batch: ₹14.00 add-on drop wage.
"""

from typing import Any


def calculate_courier_order_wage(order: dict, batch_index: int = 0) -> float:
    """
    1st order of any trip/batch: ₹20.00 base wage.
    Subsequent bundled orders in the same batch: ₹14.00 add-on drop wage.
    """
    if not isinstance(order, dict):
        return 20.0 if batch_index == 0 else 14.0

    # Explicit secondary/stacked batch orders
    if (
        order.get("is_primary_batch_order") is False
        or order.get("is_batch_addon") is True
        or order.get("wage_type") == "batch_addon"
    ):
        return 14.0

    if batch_index > 0 and order.get("is_primary_batch_order") is not True:
        return 14.0

    # Check if order already has an explicitly assigned batch wage
    if order.get("courier_earning") is not None and float(order.get("courier_earning") or 0.0) >= 14.0:
        return float(order["courier_earning"])

    # Primary/first order in a batch
    if batch_index == 0 or order.get("is_primary_batch_order", True):
        return 20.0

    # Secondary/stacked batch orders
    return 14.0


def apply_courier_batch_wages(orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Sequences courier orders and applies tiered wages:
    - 1st order (index == 0): courier_earning = 20.0, wage_type = "base", is_primary_batch_order = True
    - 2nd+ orders (index > 0): courier_earning = 14.0, wage_type = "batch_addon", is_primary_batch_order = False
    """
    if not orders:
        return []

    # Sequence active runs: index 0 is primary (₹20), index > 0 are batch add-ons (₹14)
    for idx, ord_item in enumerate(orders):
        is_primary = idx == 0
        ord_item["is_primary_batch_order"] = is_primary
        ord_item["is_batch_addon"] = not is_primary
        ord_item["wage_type"] = "base" if is_primary else "batch_addon"
        wage = calculate_courier_order_wage(ord_item, batch_index=idx)
        ord_item["courier_earning"] = wage
        ord_item["delivery_partner_earning"] = wage

    return orders
