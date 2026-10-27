from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RunnerAgreementAcceptance(BaseModel):
    """Pydantic v2 model validating runner digital click-wrap agreement acceptance."""

    model_config = ConfigDict(str_strip_whitespace=True)

    runner_id: str
    full_name: str = Field(..., min_length=3)
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    emergency_contact: str = Field(..., pattern=r"^[6-9]\d{9}$")
    college_id_or_seat_no: str = Field(..., min_length=4)
    hostel_block_or_address: str = Field(..., min_length=1)
    upi_id: str = Field(..., pattern=r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$")
    terms_version: str = "v1.0_RUNNER_2026_OCT"
    agreement_hash: str = ""
    accepted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: str = ""
    user_agent: str = ""
    status: str = "LEGALLY_EXECUTED"

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if len(clean) < 3:
            raise ValueError("Full name must be at least 3 characters in length")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if not re.match(r"^[6-9]\d{9}$", clean):
            raise ValueError("Phone number must be a 10-digit Indian mobile number starting with 6-9")
        return clean

    @field_validator("emergency_contact")
    @classmethod
    def validate_emergency_contact(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if not re.match(r"^[6-9]\d{9}$", clean):
            raise ValueError("Emergency contact must be a 10-digit Indian mobile number starting with 6-9")
        return clean

    @field_validator("college_id_or_seat_no")
    @classmethod
    def validate_college_id(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if len(clean) < 4:
            raise ValueError("College ID or seat number must be at least 4 characters in length")
        return clean

    @field_validator("upi_id")
    @classmethod
    def validate_upi_id(cls, v: str) -> str:
        clean = v.strip() if v else ""
        if not re.match(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$", clean):
            raise ValueError("UPI ID must be a valid handle (e.g. username@okaxis or mobile@ybl)")
        return clean


class RunnerAgreementStatusResponse(BaseModel):
    """Status payload informing frontend if runner agreement is signed."""

    agreement_signed: bool
    runner_id: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    college_id: Optional[str] = None
    agreement_version: Optional[str] = None
    agreement_signed_at: Optional[datetime] = None
    terms_text: str
    terms_hash: str
