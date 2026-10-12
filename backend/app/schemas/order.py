from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


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

    total: float = 0.0
    total_amount: Optional[float] = None
    items_subtotal: Optional[float] = None
    gst: Optional[float] = None
    delivery_fee: Optional[float] = None
    platform_fee: Optional[float] = None
    commission_amount: Optional[float] = None
    net_payout: Optional[float] = None

    # Delivery recipient type
    delivery_for: str = "self"

    # Delivery Type: "HOSTEL_BATCH" | "STANDARD" | "EXPRESS_DOOR" | "COUNTER_TAKEAWAY"
    delivery_type: str = "HOSTEL_BATCH"
    # Modern fulfillment mode: "delivery" | "takeaway"
    fulfillment_mode: Optional[str] = None
    order_type: Optional[str] = None
    hostel_block: Optional[str] = None
    batch_window_id: Optional[str] = None
    scheduled_wave: Optional[str] = None
    batch_id: Optional[str] = None
    is_batch_addon: bool = False
    tip_amount: float = 0.0

    # Pricing breakdown (statutory GST, platform fee, commission, partner earning)
    pricing_breakdown: Optional[dict[str, Any]] = None

    # Coupon & Cash Round-off support
    coupon_code: Optional[str] = None
    discount_amount: Optional[float] = 0.0
    round_off: Optional[float] = 0.0

    # Customer GPS - optional
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Restaurant GPS
    restaurant_latitude: float = 18.520430
    restaurant_longitude: float = 73.856743

    status: str = "Pending"

    delivery_otp: Optional[int] = None

    otp_verified: bool = False

    review_submitted: bool = False

    items: list[OrderItem]

    restaurant: Optional["RestaurantSnapshot"] = None
    restaurant_info: Optional["RestaurantSnapshot"] = None
    restaurant_id: Optional[str] = None
    restaurant_name: Optional[str] = None


class RestaurantSnapshot(BaseModel):
    name: Optional[str] = "Zeal Campus Eatery"
    address: Optional[str] = "Zeal College Campus, Narhe"
    stall_location: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = 18.4485
    longitude: Optional[float] = 73.8242


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    id: Optional[str] = None
    _id: Optional[str] = None
    restaurant_id: Optional[str] = None
    restaurant_name: Optional[str] = None
    restaurant: Optional[RestaurantSnapshot] = None
    restaurant_info: Optional[RestaurantSnapshot] = None
    items_subtotal: float = 0.0
    gst: float = 0.0
    delivery_fee: float = 0.0
    platform_fee: float = 0.0
    commission_amount: float = 0.0
    net_payout: float = 0.0
    total_amount: float = 0.0


# Aliases for flexible schema usage
OrderCreate = Order
OrderCreateRequest = Order


