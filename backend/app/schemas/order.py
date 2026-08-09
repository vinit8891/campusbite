from pydantic import BaseModel


class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int


class Order(BaseModel):
    restaurant_email: str

    customer_name: str

    phone: str

    address: str

    payment_method: str

    total: float

    # Delivery recipient type
    delivery_for: str = "self"

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