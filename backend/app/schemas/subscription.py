from __future__ import annotations

from datetime import date as dt_date, timedelta

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

VALID_MEAL_TYPES = {"breakfast", "lunch", "dinner", "combo"}
VALID_SUBSCRIPTION_TYPES = {"weekly", "monthly", "WEEKLY", "MONTHLY"}
VALID_PLAN_TYPES = {"weekly", "monthly", "WEEKLY", "MONTHLY"}
VALID_DELIVERY_PREFERENCES = {
    "DINE_IN",
    "HOSTEL_LOBBY_DELIVERY",
    "dine_in",
    "hostel_lobby_delivery",
}
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


def calculate_subscription_pricing(
    plan_type: str = "WEEKLY",
    meal_type: str = "lunch",
    delivery_preference: str = "DINE_IN",
    base_meal_price: float = 80.0,
    custom_meals_count: int | None = None,
) -> dict:
    """
    Computes transparent pricing model for weekly and monthly mess subscriptions:
    - meals_count: 7 (weekly single), 14 (weekly combo), 30 (monthly single), 60 (monthly combo)
    - base_meal_price: e.g. ₹80/meal
    - delivery_addon: ₹15 * meals_count if HOSTEL_LOBBY_DELIVERY, else ₹0
    - platform_fee: Flat ₹25 for weekly pass, ₹50 for monthly pass
    - total_price: (base_meal_price * meals_count) + delivery_addon + platform_fee
    """
    norm_plan = str(plan_type).upper()
    norm_pref = str(delivery_preference).upper()
    norm_meal = str(meal_type).lower()

    if custom_meals_count is not None and custom_meals_count > 0:
        meals_count = int(custom_meals_count)
    else:
        if norm_plan == "WEEKLY":
            meals_count = 14 if norm_meal == "combo" else 7
        else:
            meals_count = 60 if norm_meal == "combo" else 30

    delivery_rate = 15.0 if norm_pref == "HOSTEL_LOBBY_DELIVERY" else 0.0
    delivery_addon = round(delivery_rate * meals_count, 2)
    platform_fee = 25.0 if norm_plan == "WEEKLY" else 50.0
    base_food_total = round(float(base_meal_price) * meals_count, 2)
    total_price = round(base_food_total + delivery_addon + platform_fee, 2)

    return {
        "plan_type": norm_plan,
        "meal_type": norm_meal,
        "delivery_preference": norm_pref,
        "meals_count": meals_count,
        "base_meal_price": float(base_meal_price),
        "base_food_total": base_food_total,
        "delivery_addon": delivery_addon,
        "platform_fee": platform_fee,
        "total_price": total_price,
    }


def compute_subscription_end_date(
    start_date: dt_date, subscription_type: str
) -> dt_date:
    normalized = str(subscription_type).lower()
    if normalized == "weekly":
        return start_date + timedelta(days=6)
    return start_date + timedelta(days=29)


class SubscriptionCreate(BaseModel):
    plan_id: str | None = None
    restaurant_email: EmailStr | None = None
    subscription_type: str | None = None
    plan_type: str | None = None
    delivery_preference: str | None = "DINE_IN"
    meal_type: str | None = None
    start_date: dt_date
    end_date: dt_date | None = None
    delivery_days: list[str] | None = None
    price: float | None = Field(default=None, gt=0)
    base_meal_price: float | None = Field(default=None, gt=0)
    meals_count: int | None = Field(default=None, gt=0)
    delivery_addon: float | None = Field(default=None, ge=0)
    platform_fee: float | None = Field(default=None, ge=0)
    hostel_block: str | None = None
    payment_status: str = "pending"
    auto_renew: bool = False

    @field_validator("delivery_preference")
    @classmethod
    def validate_delivery_preference(cls, value: str | None) -> str | None:
        if value is None:
            return "DINE_IN"
        normalized = value.strip().upper()
        if normalized not in VALID_DELIVERY_PREFERENCES:
            return "DINE_IN"
        return normalized

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


