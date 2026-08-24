"""Reusable email notification templates."""

from __future__ import annotations

from typing import Any

TEMPLATE_CUSTOMER_ORDER_PLACED = "customer_order_placed"
TEMPLATE_RESTAURANT_NEW_ORDER = "restaurant_new_order"
TEMPLATE_DELIVERY_PARTNER_ASSIGNED = "delivery_partner_assigned"
TEMPLATE_ORDER_DELIVERED = "order_delivered"
TEMPLATE_REFUND_INITIATED = "refund_initiated"
TEMPLATE_PASSWORD_RESET = "password_reset"
TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_CUSTOMER = (
    "subscription_order_generated_customer"
)
TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_RESTAURANT = (
    "subscription_order_generated_restaurant"
)
TEMPLATE_SUBSCRIPTION_RENEWED_CUSTOMER = "subscription_renewed_customer"
TEMPLATE_SUBSCRIPTION_PAYMENT_FAILED_CUSTOMER = "subscription_payment_failed_customer"
TEMPLATE_SUBSCRIPTION_RENEWED_RESTAURANT = "subscription_renewed_restaurant"


def _short_order_id(order_id: str | None) -> str:
    if not order_id:
        return "—"
    text = str(order_id)
    return text if len(text) <= 12 else f"{text[:8]}…"


def render_template(notification_type: str, context: dict[str, Any]) -> tuple[str, str]:
    """Return (subject, plain_text_body) for a notification type."""
    order_id = _short_order_id(context.get("order_id"))
    customer = context.get("customer_name") or "Customer"
    restaurant = context.get("restaurant_email") or "Restaurant"
    total = context.get("total")
    total_text = f"₹{total}" if total is not None else "—"
    status = context.get("status") or "—"
    partner = (context.get("delivery_partner") or {}).get("name") or "Delivery partner"
    refund_id = context.get("refund_id") or order_id

    if notification_type == TEMPLATE_CUSTOMER_ORDER_PLACED:
        if status == "Accepted":
            return (
                f"CampusBite order #{order_id} accepted",
                (
                    f"Hi {customer},\n\n"
                    f"Good news — the restaurant has accepted your order #{order_id}.\n"
                    f"Restaurant: {restaurant}\n"
                    f"Total: {total_text}\n\n"
                    "We will notify you as your order progresses."
                ),
            )
        return (
            f"CampusBite order #{order_id} placed",
            (
                f"Hi {customer},\n\n"
                f"Your order #{order_id} has been placed successfully.\n"
                f"Restaurant: {restaurant}\n"
                f"Total: {total_text}\n"
                f"Status: {status}\n\n"
                "Thank you for ordering with CampusBite."
            ),
        )

    if notification_type == TEMPLATE_RESTAURANT_NEW_ORDER:
        return (
            f"New CampusBite order #{order_id}",
            (
                f"A new order #{order_id} is waiting for your review.\n"
                f"Customer: {customer}\n"
                f"Total: {total_text}\n"
                f"Status: {status}\n\n"
                "Please accept or update the order in your dashboard."
            ),
        )

    if notification_type == TEMPLATE_DELIVERY_PARTNER_ASSIGNED:
        return (
            f"Delivery assigned — order #{order_id}",
            (
                f"Hi {partner},\n\n"
                f"You have been assigned order #{order_id}.\n"
                f"Restaurant: {restaurant}\n"
                f"Customer: {customer}\n"
                f"Pickup when the order is ready."
            ),
        )

    if notification_type == TEMPLATE_ORDER_DELIVERED:
        return (
            f"Order #{order_id} delivered",
            (
                f"Hi {customer},\n\n"
                f"Your CampusBite order #{order_id} has been delivered.\n"
                "Enjoy your meal!"
            ),
        )

    if notification_type == TEMPLATE_REFUND_INITIATED:
        return (
            f"Refund initiated for order #{order_id}",
            (
                f"Hi {customer},\n\n"
                f"A refund has been initiated for order #{order_id}.\n"
                f"Reference: {refund_id}\n"
                "It may take a few business days to appear on your statement."
            ),
        )

    if notification_type == TEMPLATE_PASSWORD_RESET:
        reset_link = context.get("reset_link") or "https://campusbite.in/reset-password"
        return (
            "CampusBite Password Reset Request",
            (
                f"Hi {customer},\n\n"
                "We received a request to reset your CampusBite account password.\n\n"
                f"Click the link below to set a new password:\n{reset_link}\n\n"
                "This recovery link will expire in 15 minutes.\n"
                "If you did not request this, you can safely ignore this email.\n"
            ),
        )

    if notification_type == TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_CUSTOMER:
        meal_name = context.get("meal_name") or "your meal"
        target_date = context.get("target_date") or "today"
        return (
            "Your mess meal has been scheduled",
            (
                f"Hi {customer},\n\n"
                f"Today's meal has been scheduled for {target_date}.\n"
                f"Meal: {meal_name}\n"
                f"Restaurant: {restaurant}\n"
                f"Order #{order_id} · Status: {status}\n\n"
                "View details in My Orders on CampusBite."
            ),
        )

    if notification_type == TEMPLATE_SUBSCRIPTION_ORDER_GENERATED_RESTAURANT:
        target_date = context.get("target_date") or "today"
        meal_count = context.get("meal_count") or 1
        return (
            "New subscription meals are ready",
            (
                f"Subscription meals for {target_date} are ready.\n"
                f"New meals: {meal_count}\n\n"
                "Review them in your Restaurant Orders dashboard."
            ),
        )

    if notification_type == TEMPLATE_SUBSCRIPTION_RENEWED_CUSTOMER:
        plan_name = context.get("plan_name") or "your mess plan"
        billing_period = context.get("billing_period") or "—"
        amount = context.get("amount")
        amount_text = f"₹{amount}" if amount is not None else "—"
        return (
            "Subscription renewed successfully",
            (
                f"Hi {customer},\n\n"
                f"Your subscription ({plan_name}) has been renewed.\n"
                f"Billing period: {billing_period}\n"
                f"Amount paid: {amount_text}\n\n"
                "Thank you for continuing with CampusBite."
            ),
        )

    if notification_type == TEMPLATE_SUBSCRIPTION_PAYMENT_FAILED_CUSTOMER:
        plan_name = context.get("plan_name") or "your mess plan"
        return (
            "Subscription payment failed",
            (
                f"Hi {customer},\n\n"
                f"We could not process your renewal payment for {plan_name}.\n"
                "Please retry from the Subscriptions page in CampusBite."
            ),
        )

    if notification_type == TEMPLATE_SUBSCRIPTION_RENEWED_RESTAURANT:
        plan_name = context.get("plan_name") or "mess plan"
        customer_email = context.get("customer_email") or "A customer"
        billing_period = context.get("billing_period") or "—"
        return (
            "Customer subscription renewed",
            (
                f"A customer has renewed their subscription.\n"
                f"Customer: {customer_email}\n"
                f"Plan: {plan_name}\n"
                f"Billing period: {billing_period}\n\n"
                "View details in your Restaurant Subscriptions dashboard."
            ),
        )

    return (
        "CampusBite notification",
        f"Notification ({notification_type}) for order #{order_id}.",
    )
