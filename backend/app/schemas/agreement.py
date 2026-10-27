from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class MerchantAgreementAcceptance(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    canteen_id: str
    signatory_name: str = Field(..., min_length=3)
    signatory_designation: str = "Proprietor"
    signatory_phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    canteen_fssai_number: str = Field(..., pattern=r"^\d{14}$")
    terms_version: str = "v1.0_2026_OCT"
    agreement_hash: str = ""
    accepted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: str = ""
    user_agent: str = ""
    status: str = "LEGALLY_EXECUTED"

    @field_validator("signatory_name")
    @classmethod
    def validate_signatory_name(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if len(clean) < 3:
            raise ValueError("Signatory name must be at least 3 characters in length")
        return clean

    @field_validator("signatory_phone")
    @classmethod
    def validate_signatory_phone(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if not re.match(r"^[6-9]\d{9}$", clean):
            raise ValueError("Signatory phone must be a 10-digit Indian mobile number starting with 6-9")
        return clean

    @field_validator("canteen_fssai_number")
    @classmethod
    def validate_fssai_number(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if not re.match(r"^\d{14}$", clean):
            raise ValueError("Canteen FSSAI number must be a 14-digit numeric string")
        return clean


class AgreementStatusResponse(BaseModel):
    agreement_signed: bool
    canteen_id: Optional[str] = None
    canteen_name: Optional[str] = None
    fssai_number: Optional[str] = None
    agreement_version: Optional[str] = None
    agreement_signed_at: Optional[datetime] = None
    terms_text: str
    terms_hash: str
