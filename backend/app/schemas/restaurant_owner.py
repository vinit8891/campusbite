from pydantic import BaseModel, EmailStr


class RestaurantOwner(BaseModel):
    owner_name: str
    restaurant_name: str
    email: EmailStr
    phone: str
    password: str
    restaurant_type: str
    address: str
    city: str
    pincode: str