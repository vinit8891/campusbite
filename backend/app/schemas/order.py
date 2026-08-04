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
    status: str = "Placed"
    items: list[OrderItem]