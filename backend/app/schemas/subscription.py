from __future__ import annotations

from datetime import date as dt_date, timedelta

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

VALID_MEAL_TYPES = {"breakfast", "lunch", "dinner", "combo"}
VALID_SUBSCRIPTION_TYPES = {"weekly", "monthly"}
VALID_STATUSES = {"active", "paused", "expired", "cancelled"}
VALID_WEEKDAYS = {
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
}


def compute_subscription_end_date(
    start_date: dt_date, subscription_type: str
) -> dt_date:
    if subscription_type == "weekly":
        return start_date + timedelta(days=6)
    return start_date + timedelta(days=29)


class SubscriptionCreate(BaseModel):
    plan_id: str | None = None
    restaurant_email: EmailStr | None = None
    subscription_type: str | None = None
    meal_type: str | None = None
    start_date: dt_date
    end_date: dt_date | None = None
    delivery_days: list[str] | None = None
    price: float | None = Field(default=None, gt=0)
    payment_status: str = "pending"
    auto_renew: bool = False

    @field_validator("subscription_type")
    @classmethod
    def validate_subscription_type(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        if normalized not in VALID_SUBSCRIPTION_TYPES:
            raise ValueError("subscription_type must be weekly or monthly")
        return normalized

    @field_validator("meal_type")
    @classmethod
    def validate_meal_type(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        if normalized not in VALID_MEAL_TYPES:
            raise ValueError(
                "meal_type must be breakfast, lunch, dinner, or combo"
            )
        return normalized

    @field_validator("delivery_days")
    @classmethod
    def validate_delivery_days(
        cls, value: list[str] | None
    ) -> list[str] | None:
        if value is None:
            return value
        normalized = [
            day.strip().lower() for day in value if day and day.strip()
        ]
        if not normalized:
            raise ValueError("delivery_days cannot be empty")
        invalid = [day for day in normalized if day not in VALID_WEEKDAYS]
        if invalid:
            raise ValueError(f"Invalid delivery days: {', '.join(invalid)}")
        return sorted(set(normalized))

    @model_validator(mode="after")
    def validate_create_mode(self):
        if not self.plan_id:
            missing = []
            if not self.restaurant_email:
                missing.append("restaurant_email")
            if not self.subscription_type:
                missing.append("subscription_type")
            if not self.meal_type:
                missing.append("meal_type")
            if not self.delivery_days:
                missing.append("delivery_days")
            if self.price is None:
                missing.append("price")
            if not self.end_date:
                missing.append("end_date")
            if missing:
                raise ValueError(
                    f"When plan_id is omitted, required fields: {', '.join(missing)}"
                )
        return self


class SubscriptionPauseRequest(BaseModel):
    pause_from: dt_date
    pause_to: dt_date

    @field_validator("pause_to")
    @classmethod
    def validate_pause_range(cls, pause_to: dt_date, info):
        pause_from = info.data.get("pause_from")
        if pause_from and pause_to < pause_from:
            raise ValueError("pause_to must be on or after pause_from")
        return pause_to


class SubscriptionSkipDateRequest(BaseModel):
    date: dt_date


class SubscriptionRedeemTokenRequest(BaseModel):
    token: str
    restaurant_email: EmailStr | None = None
    date: dt_date | None = None


