from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.subscription import (
    VALID_MEAL_TYPES,
    VALID_SUBSCRIPTION_TYPES,
    VALID_WEEKDAYS,
)


def _validate_time(value: str, field_name: str) -> str:
    normalized = value.strip()
    parts = normalized.split(":")
    if len(parts) < 2:
        raise ValueError(f"{field_name} must be HH:MM")
    hour, minute = parts[0], parts[1]
    if not hour.isdigit() or not minute.isdigit():
        raise ValueError(f"{field_name} must be HH:MM")
    h, m = int(hour), int(minute)
    if h < 0 or h > 23 or m < 0 or m > 59:
        raise ValueError(f"{field_name} must be a valid time")
    return f"{h:02d}:{m:02d}"


class SubscriptionPlanBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    subscription_type: str
    meal_type: str
    price: float = Field(gt=0)
    delivery_days: list[str] = Field(min_length=1)
    start_time: str
    end_time: str
    active: bool = True

    @field_validator("subscription_type")
    @classmethod
    def validate_subscription_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in VALID_SUBSCRIPTION_TYPES:
            raise ValueError("subscription_type must be weekly or monthly")
        return normalized

    @field_validator("meal_type")
    @classmethod
    def validate_meal_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in VALID_MEAL_TYPES:
            raise ValueError("meal_type must be breakfast, lunch, dinner, or combo")
        return normalized

    @field_validator("delivery_days")
    @classmethod
    def validate_delivery_days(cls, value: list[str]) -> list[str]:
        normalized = [day.strip().lower() for day in value if day and day.strip()]
        if not normalized:
            raise ValueError("delivery_days cannot be empty")
        invalid = [day for day in normalized if day not in VALID_WEEKDAYS]
        if invalid:
            raise ValueError(f"Invalid delivery days: {', '.join(invalid)}")
        return sorted(set(normalized))

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, value: str) -> str:
        return _validate_time(value, "start_time")

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, value: str) -> str:
        return _validate_time(value, "end_time")


class SubscriptionPlanCreate(SubscriptionPlanBase):
    restaurant_email: EmailStr


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    subscription_type: str | None = None
    meal_type: str | None = None
    price: float | None = Field(default=None, gt=0)
    delivery_days: list[str] | None = None
    start_time: str | None = None
    end_time: str | None = None
    active: bool | None = None

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
            raise ValueError("meal_type must be breakfast, lunch, dinner, or combo")
        return normalized

    @field_validator("delivery_days")
    @classmethod
    def validate_delivery_days(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        normalized = [day.strip().lower() for day in value if day and day.strip()]
        if not normalized:
            raise ValueError("delivery_days cannot be empty")
        invalid = [day for day in normalized if day not in VALID_WEEKDAYS]
        if invalid:
            raise ValueError(f"Invalid delivery days: {', '.join(invalid)}")
        return sorted(set(normalized))

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_time(value, "start_time")

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_time(value, "end_time")
