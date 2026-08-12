from datetime import date as DateType

from pydantic import BaseModel, Field


class SubscriptionGenerateRequest(BaseModel):
    target_date: DateType = Field(alias="date", description="Target date (YYYY-MM-DD)")

    model_config = {"populate_by_name": True}
