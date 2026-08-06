from pydantic import BaseModel


class Review(BaseModel):
    order_id: str

    restaurant_email: str

    delivery_partner_phone: str

    customer_name: str

    rating: int

    review: str