"""Payment request/response schemas."""

from pydantic import BaseModel, Field


class CreateRazorpayPaymentRequest(BaseModel):
    order_id: str = Field(..., min_length=1)
    # Optional client hint only — server recalculates and validates.
    amount: float | None = None


class VerifyRazorpayPaymentRequest(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class CancelPaymentRequest(BaseModel):
    order_id: str
    reason: str | None = None


class MockCheckoutCompleteRequest(BaseModel):
    """Mock-mode only — simulates Razorpay Checkout outcomes without secrets in the browser."""

    order_id: str
    outcome: str = Field(
        ...,
        description="success | failure | dismiss",
    )


class CreateRefundRequest(BaseModel):
    order_id: str
    # None / omitted => full refund of paid amount
    amount_paise: int | None = None
    reason: str | None = None
    idempotency_key: str | None = None
