"""Unit and integration tests for Merchant Partner Click-Wrap Agreement."""

import hashlib
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import pytest
from pydantic import ValidationError

from app.schemas.agreement import MerchantAgreementAcceptance
from app.routers.partner import TERMS_HASH, TERMS_TEXT_V1, ensure_agreement_signed


def test_terms_hash_calculation():
    """Verify that TERMS_HASH is the correct SHA-256 of TERMS_TEXT_V1."""
    expected = hashlib.sha256(TERMS_TEXT_V1.encode("utf-8")).hexdigest()
    assert TERMS_HASH == expected
    assert "18% (eighteen percent)" in TERMS_TEXT_V1
    assert "9:00 PM IST" in TERMS_TEXT_V1
    assert "Tuesday and Friday" in TERMS_TEXT_V1
    assert "Section 79 of the Information Technology Act, 2000" in TERMS_TEXT_V1
    assert "FSSAI" in TERMS_TEXT_V1


def test_schema_valid_merchant_agreement():
    """Validates that correct payload passes Pydantic v2 validation."""
    payload = MerchantAgreementAcceptance(
        canteen_id="canteen-zeal-1",
        signatory_name="  Rajesh Sharma  ",
        signatory_phone="9876543210",
        canteen_fssai_number="12345678901234",
    )
    assert payload.signatory_name == "Rajesh Sharma"  # whitespace stripped
    assert payload.signatory_designation == "Proprietor"
    assert payload.terms_version == "v1.0_2026_OCT"
    assert payload.status == "LEGALLY_EXECUTED"


def test_schema_invalid_signatory_name():
    """Validates that signatory name shorter than 3 characters fails."""
    with pytest.raises(ValidationError):
        MerchantAgreementAcceptance(
            canteen_id="canteen-1",
            signatory_name="  AB  ",
            signatory_phone="9876543210",
            canteen_fssai_number="12345678901234",
        )


def test_schema_invalid_phone():
    """Validates 10-digit Indian phone validation (must start with 6-9)."""
    # Starts with 5 (invalid)
    with pytest.raises(ValidationError):
        MerchantAgreementAcceptance(
            canteen_id="canteen-1",
            signatory_name="Rajesh Sharma",
            signatory_phone="5876543210",
            canteen_fssai_number="12345678901234",
        )

    # 9 digits only (invalid)
    with pytest.raises(ValidationError):
        MerchantAgreementAcceptance(
            canteen_id="canteen-1",
            signatory_name="Rajesh Sharma",
            signatory_phone="987654321",
            canteen_fssai_number="12345678901234",
        )


def test_schema_invalid_fssai():
    """Validates 14-digit numeric FSSAI validation."""
    # 13 digits (invalid)
    with pytest.raises(ValidationError):
        MerchantAgreementAcceptance(
            canteen_id="canteen-1",
            signatory_name="Rajesh Sharma",
            signatory_phone="9876543210",
            canteen_fssai_number="1234567890123",
        )

    # 14 chars with non-digit (invalid)
    with pytest.raises(ValidationError):
        MerchantAgreementAcceptance(
            canteen_id="canteen-1",
            signatory_name="Rajesh Sharma",
            signatory_phone="9876543210",
            canteen_fssai_number="1234567890123A",
        )


@pytest.mark.asyncio
async def test_ensure_agreement_signed_guard_blocks_unsigned():
    """Guard dependency must raise HTTP 403 if agreement_signed is not True."""
    from fastapi import HTTPException

    mock_canteen = {
        "_id": "canteen-1",
        "email": "canteen@zeal.edu",
        "agreement_signed": False,
    }

    with patch("app.routers.partner.database") as mock_db:
        mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=mock_canteen)

        user = {"role": "restaurant_owner", "email": "canteen@zeal.edu", "sub": "canteen@zeal.edu"}
        with pytest.raises(HTTPException) as exc_info:
            await ensure_agreement_signed(current_user=user)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Merchant agreement pending signature"


@pytest.mark.asyncio
async def test_ensure_agreement_signed_guard_allows_signed():
    """Guard dependency must allow access if agreement_signed is True."""
    mock_canteen = {
        "_id": "canteen-1",
        "email": "canteen@zeal.edu",
        "agreement_signed": True,
        "fssai_number": "12345678901234",
    }

    with patch("app.routers.partner.database") as mock_db:
        mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=mock_canteen)

        user = {"role": "restaurant_owner", "email": "canteen@zeal.edu", "sub": "canteen@zeal.edu"}
        result = await ensure_agreement_signed(current_user=user)
        assert result == user


@pytest.mark.asyncio
async def test_ensure_agreement_signed_allows_admin():
    """Admin users must bypass the agreement signature requirement."""
    admin_user = {"role": "admin", "email": "admin@campusbite.com", "sub": "admin"}
    result = await ensure_agreement_signed(current_user=admin_user)
    assert result == admin_user
