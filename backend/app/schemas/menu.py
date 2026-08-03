from pydantic import BaseModel


class MenuItem(BaseModel):
    restaurant_email: str
    name: str
    description: str
    price: float
    category: str
    image: str
    available: bool = True