"""Global system settings model and collection helper."""

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field

from app.db.database import database

DEFAULT_SYSTEM_CONFIG: dict[str, Any] = {
    "_id": "global_config",
    "is_platform_active": True,
    "maintenance_message": "CampusBite is currently paused for scheduled maintenance.",
    "max_cod_limit": 500.0,
    "surge_fee": 0.0,
    "operating_hours": {"start": "08:00", "end": "02:00"},
}


class OperatingHours(BaseModel):
    start: str = "08:00"
    end: str = "02:00"


class SystemConfigModel(BaseModel):
    is_platform_active: bool = True
    maintenance_message: str = "CampusBite is currently paused for scheduled maintenance."
    max_cod_limit: float = 500.0
    surge_fee: float = 0.0
    operating_hours: OperatingHours = Field(default_factory=OperatingHours)


def _get_col(db_obj: Any, col_name: str) -> Any:
    if db_obj is None:
        return None
    if isinstance(db_obj, dict):
        return db_obj.get(col_name)
    if hasattr(db_obj, col_name):
        return getattr(db_obj, col_name)
    try:
        return db_obj[col_name]
    except Exception:
        return None


async def get_system_settings(db: Any = None) -> dict[str, Any]:
    """Retrieve global platform configuration, creating or returning defaults if missing."""
    active_db = db if db is not None else database
    col = _get_col(active_db, "system_settings")
    if col is None:
        return dict(DEFAULT_SYSTEM_CONFIG)

    try:
        doc = await col.find_one({"_id": "global_config"})
    except Exception:
        doc = None

    if not doc:
        default_copy = dict(DEFAULT_SYSTEM_CONFIG)
        try:
            await col.insert_one(default_copy)
        except Exception:
            pass
        return dict(DEFAULT_SYSTEM_CONFIG)

    res = dict(DEFAULT_SYSTEM_CONFIG)
    res.update(doc)
    return res


async def update_system_settings(update_data: dict[str, Any], db: Any = None) -> dict[str, Any]:
    """Upsert global platform configuration with provided patch data."""
    active_db = db if db is not None else database
    col = _get_col(active_db, "system_settings")

    clean_update = {k: v for k, v in update_data.items() if k != "_id"}
    clean_update["updated_at"] = datetime.now(timezone.utc)

    if col is not None:
        try:
            await col.update_one(
                {"_id": "global_config"},
                {"$set": clean_update},
                upsert=True,
            )
        except Exception:
            pass

    return await get_system_settings(active_db)
