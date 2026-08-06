from pydantic import BaseModel


class OrderItem(BaseModel):
    id: int
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

    # Customer GPS
    latitude: float
    longitude: float

    # Restaurant GPS
    restaurant_latitude: float
    restaurant_longitude: float

    status: str = "Placed"

    delivery_otp: int | None = None

    otp_verified: bool = False

    review_submitted: bool = False

    items: list[OrderItem]