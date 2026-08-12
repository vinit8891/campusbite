from pydantic import BaseModel, Field


class SubscriptionRenewRequest(BaseModel):
    confirm_expired: bool = False


class SubscriptionVerifyRenewalRequest(BaseModel):
    razorpay_order_id: str = Field(min_length=1)
    razorpay_payment_id: str = Field(min_length=1)
    razorpay_signature: str = Field(min_length=1)
    payment_id: str | None = None


class SubscriptionMockRenewalRequest(BaseModel):
    outcome: str = Field(description="success, failure, or dismiss")
