from pydantic import BaseModel


class Restaurant(BaseModel):
    slug: str
    name: str
    email: str
    cuisine: str
    rating: float
    delivery_time: str
    distance: str
    image: str

    # Restaurant GPS
    latitude: float = 18.52043
    longitude: float = 73.856743