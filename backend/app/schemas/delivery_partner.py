from pydantic import BaseModel


class DeliveryPartner(BaseModel):
    name: str
    phone: str
    email: str
    password: str
    vehicle: str
    vehicle_number: str