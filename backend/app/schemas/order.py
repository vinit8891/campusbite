from pydantic import BaseModel


class OrderItem(BaseModel):
    id: int
    name: str
    price: float
    image: str
    quantity: int


class Order(BaseModel):
    customer_name: str
    phone: str
    address: str
    city: str
    pincode: str
    landmark: str
    payment_method: str

    items: list[OrderItem]

    subtotal: float
    delivery_fee: float
    total: float

    status: str