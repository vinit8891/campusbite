from pydantic import BaseModel, Field
from typing import List


class MenuItem(BaseModel):
    _id: str | None = None
    name: str
    description: str = ""
    image: str
    price: float
    available: bool = True


class Restaurant(BaseModel):
    slug: str
    name: str
    email: str
    cuisine: str
    rating: float
    delivery_time: str
    distance: str
    image: str
    description: str = ""
    menu: List[MenuItem] = Field(default_factory=list)