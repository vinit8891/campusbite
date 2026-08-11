"""Canonical role values used in JWT claims and route guards."""

CUSTOMER = "customer"
RESTAURANT_OWNER = "restaurant_owner"
DELIVERY_PARTNER = "delivery_partner"
ADMIN = "admin"

ALL_ROLES = (
    CUSTOMER,
    RESTAURANT_OWNER,
    DELIVERY_PARTNER,
    ADMIN,
)
