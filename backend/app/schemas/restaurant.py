from typing import Optional, List
from pydantic import BaseModel


class Restaurant(BaseModel):
    slug: str
    name: str
    email: str
    cuisine: str
    rating: float = 4.5
    delivery_time: str = "30 min"
    distance: str = "2 km"
    image: str

    # Optional profile fields (omit from payload to leave unchanged)
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    closing_hours: Optional[str] = None

    # Restaurant GPS
    latitude: float = 18.52043
    longitude: float = 73.856743


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    cuisine_type: Optional[str] = None
    cuisine: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    opening_hours: Optional[str] = None
    closing_hours: Optional[str] = None
    banner_image: Optional[str] = None
    image_url: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    is_accepting_orders: Optional[bool] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    slug: Optional[str] = None
    rating: Optional[float] = None
    delivery_time: Optional[str] = None
    distance: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
