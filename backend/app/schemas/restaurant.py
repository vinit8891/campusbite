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
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    opening_hours: str | None = None
    closing_hours: str | None = None

    # Restaurant GPS
    latitude: float = 18.52043
    longitude: float = 73.856743
