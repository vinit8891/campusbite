from pydantic import BaseModel
from typing import List


class MenuItem(BaseModel):
    id: int
    name: str
    price: float
    image: str


class Restaurant(BaseModel):
    slug: str
    name: str
    cuisine: str
    rating: float
    delivery_time: str
    distance: str
    image: str
    menu: List[MenuItem]