"""Schemas and Enums for Flexible Multi-Tier Partner Onboarding & Admin Verification."""

from __future__ import annotations

from enum import Enum
import re
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class VendorType(str, Enum):
    CAMPUS_CANTEEN = "CAMPUS_CANTEEN"
    HOME_TIFFIN = "HOME_TIFFIN"
    STREET_STALL = "STREET_STALL"


class CourierType(str, Enum):
    STUDENT = "STUDENT"
    EXTERNAL_GIG = "EXTERNAL_GIG"


class VerificationStatus(str, Enum):
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class TransitMode(str, Enum):
    WALKING = "WALKING"
    BICYCLE = "BICYCLE"
    MOTORCYCLE = "MOTORCYCLE"
    EV_SCOOTER = "EV_SCOOTER"


class ComplianceDocType(str, Enum):
    FSSAI_LICENSE = "FSSAI_LICENSE"
    AADHAAR_KYC = "AADHAAR_KYC"
    COLLEGE_PERMIT = "COLLEGE_PERMIT"


class CourierIdProofType(str, Enum):
    STUDENT_ID = "STUDENT_ID"
    AADHAAR = "AADHAAR"
    DRIVING_LICENSE = "DRIVING_LICENSE"


IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$", re.IGNORECASE)
UPI_REGEX = re.compile(r"^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$")


class RestaurantOnboardingRequest(BaseModel):
    vendor_type: VendorType
    business_name: str = Field(..., min_length=2, max_length=120)
    owner_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    password: str = Field(..., min_length=6)
    address_or_stall_landmark: str = Field(..., min_length=3, max_length=255)
    is_inside_campus: bool = True
    compliance_doc_type: ComplianceDocType
    compliance_doc_url: str = Field(..., min_length=1)
    kitchen_or_stall_photo_url: str = Field(..., min_length=1)
    bank_account_holder: str = Field(..., min_length=2, max_length=100)
    bank_account_number: str = Field(..., min_length=8, max_length=24)
    bank_ifsc_code: str = Field(...)
    settlement_upi_id: str = Field(...)

    @field_validator("bank_ifsc_code")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        v_clean = v.strip().upper()
        if not IFSC_REGEX.match(v_clean):
            raise ValueError("Invalid Indian IFSC code format (e.g., SBIN0001234, HDFC0000123).")
        return v_clean

    @field_validator("settlement_upi_id")
    @classmethod
    def validate_upi(cls, v: str) -> str:
        v_clean = v.strip()
        if not UPI_REGEX.match(v_clean):
            raise ValueError("Invalid UPI ID format (e.g., business@okhdfcbank, name@upi).")
        return v_clean


class StudentDetails(BaseModel):
    roll_no: str = Field(..., min_length=1, max_length=50)
    hostel_block: str = Field(..., min_length=1, max_length=50)
    year: str = Field(..., min_length=1, max_length=20)


class CourierOnboardingRequest(BaseModel):
    courier_type: CourierType
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    password: str = Field(..., min_length=6)
    transit_mode: TransitMode
    id_proof_type: CourierIdProofType
    id_proof_doc_url: str = Field(..., min_length=1)
    student_details: Optional[StudentDetails] = None
    vehicle_number: Optional[str] = None
    payout_upi_id: str = Field(...)
    emergency_contact_phone: str = Field(..., min_length=10, max_length=15)

    @field_validator("payout_upi_id")
    @classmethod
    def validate_upi(cls, v: str) -> str:
        v_clean = v.strip()
        if not UPI_REGEX.match(v_clean):
            raise ValueError("Invalid UPI ID format (e.g., name@okhdfcbank, rider@upi).")
        return v_clean

    def model_post_init(self, __context: Any) -> None:
        if self.courier_type == CourierType.STUDENT:
            if not self.student_details or not self.student_details.roll_no:
                raise ValueError("student_details (roll_no, hostel_block, year) is required for Student Couriers.")
        if self.transit_mode in (TransitMode.MOTORCYCLE, TransitMode.EV_SCOOTER):
            if not self.vehicle_number or not self.vehicle_number.strip():
                raise ValueError("vehicle_number is required for Motorcycle and EV Scooter couriers.")


class VerificationDecisionRequest(BaseModel):
    action: str = Field(..., pattern="^(APPROVE|REJECT|SUSPEND)$")
    rejection_reason: Optional[str] = None
