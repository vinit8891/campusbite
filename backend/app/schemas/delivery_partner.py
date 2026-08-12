from pydantic import BaseModel


class DeliveryPartner(BaseModel):
    name: str
    phone: str
    email: str
    password: str
    vehicle: str
    vehicle_number: str


class DeliveryPartnerProfileUpdate(BaseModel):
    """Safe profile fields partners may update. Email/phone/auth remain immutable."""

    name: str | None = None
    vehicle: str | None = None
    vehicle_type: str | None = None  # alias for vehicle
    vehicle_number: str | None = None
    profile_image: str | None = None
    online: bool | None = None
