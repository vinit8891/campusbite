from typing import Any
from pydantic import BaseModel, Field


class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int
    is_budget_meal: bool = False


class Order(BaseModel):
    restaurant_email: str
    customer_name: str
    phone: str
    address: str

    # "cod" | "online"
    payment_method: str = Field(default="cod")

    # Independent of order lifecycle status.
    # COD stays pending; online moves through processing/paid/failed/etc.
    payment_status: str = Field(default="pending")

    total: float

    # Delivery recipient type
    delivery_for: str = "self"

    # Delivery Type: "HOSTEL_BATCH" | "STANDARD"
    delivery_type: str = "HOSTEL_BATCH"
    hostel_block: str | None = None
    tip_amount: float = 0.0

    # Pricing breakdown (statutory GST, platform fee, commission, partner earning)
    pricing_breakdown: dict[str, Any] | None = None

    # Customer GPS - optional
    latitude: float | None = None
    longitude: float | None = None

    # Restaurant GPS
    restaurant_latitude: float = 18.520430
    restaurant_longitude: float = 73.856743

    status: str = "Pending"

    delivery_otp: int | None = None

    otp_verified: bool = False

    review_submitted: bool = False

    items: list[OrderItem]
