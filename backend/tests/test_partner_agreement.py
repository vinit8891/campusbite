"""Unit and integration tests for Merchant Partner Click-Wrap Agreement."""

import hashlib
import io
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.agreement import MerchantAgreementAcceptance
from app.routers.partner import TERMS_HASH, TERMS_TEXT_V1, ensure_agreement_signed
from app.services.pdf_generator import generate_merchant_agreement_pdf


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


def test_generate_merchant_agreement_pdf_buffer():
    """Verify that generate_merchant_agreement_pdf produces a valid PDF buffer with %PDF- magic bytes."""
    mock_agreement = {
        "canteen_id": "canteen-zeal-1",
        "signatory_name": "Rajesh Sharma",
        "signatory_designation": "Proprietor",
        "signatory_phone": "9876543210",
        "canteen_fssai_number": "12345678901234",
        "terms_version": "v1.0_2026_OCT",
        "agreement_hash": TERMS_HASH,
        "accepted_at": datetime(2026, 10, 27, 18, 30, 0, tzinfo=timezone.utc),
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "status": "LEGALLY_EXECUTED",
    }
    mock_canteen = {
        "_id": "canteen-zeal-1",
        "name": "Zeal Central Canteen",
        "fssai_number": "12345678901234",
        "phone": "9876543210",
        "email": "canteen@zeal.edu",
    }

    pdf_buffer = generate_merchant_agreement_pdf(mock_agreement, mock_canteen)

    assert isinstance(pdf_buffer, io.BytesIO)
    pdf_bytes = pdf_buffer.getvalue()
    assert len(pdf_bytes) > 1000
    # PDF magic byte sequence
    assert pdf_bytes.startswith(b"%PDF-")
    # PDF standard end of file marker
    assert b"%%EOF" in pdf_bytes[-1024:]


def test_download_agreement_pdf_endpoint_success():
    """Verify GET /api/partner/agreement/download-pdf/{canteen_id} returns 200 with PDF streaming."""
    mock_agreement = {
        "canteen_id": "canteen-zeal-1",
        "signatory_name": "Rajesh Sharma",
        "signatory_designation": "Proprietor",
        "signatory_phone": "9876543210",
        "canteen_fssai_number": "12345678901234",
        "terms_version": "v1.0_2026_OCT",
        "agreement_hash": TERMS_HASH,
        "accepted_at": datetime(2026, 10, 27, 18, 30, 0, tzinfo=timezone.utc),
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "status": "LEGALLY_EXECUTED",
    }
    mock_canteen = {
        "_id": "canteen-zeal-1",
        "name": "Zeal Central Canteen",
        "fssai_number": "12345678901234",
        "phone": "9876543210",
        "email": "canteen@zeal.edu",
    }

    client = TestClient(app)

    mock_agreements = MagicMock()
    mock_agreements.find_one = AsyncMock(return_value=mock_agreement)
    mock_canteens = MagicMock()
    mock_canteens.find_one = AsyncMock(return_value=mock_canteen)
    mock_restaurants = MagicMock()
    mock_restaurants.find_one = AsyncMock(return_value=None)

    def db_getitem(name):
        if name == "merchant_agreements":
            return mock_agreements
        if name == "canteens":
            return mock_canteens
        if name == "restaurants":
            return mock_restaurants
        return MagicMock()

    with patch("app.routers.partner.database") as mock_db:
        mock_db.__getitem__.side_effect = db_getitem

        resp = client.get("/api/partner/agreement/download-pdf/canteen-zeal-1")

        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert 'attachment; filename="CampusBite_Agreement_Zeal_Central_Canteen.pdf"' in resp.headers.get("content-disposition", "")
        assert resp.content.startswith(b"%PDF-")
        assert len(resp.content) > 1000


def test_download_agreement_pdf_endpoint_not_found():
    """Verify GET /api/partner/agreement/download-pdf/{canteen_id} returns 404 when no agreement exists."""
    client = TestClient(app)

    mock_agreements = MagicMock()
    mock_agreements.find_one = AsyncMock(return_value=None)
    mock_canteens = MagicMock()
    mock_canteens.find_one = AsyncMock(return_value=None)
    mock_restaurants = MagicMock()
    mock_restaurants.find_one = AsyncMock(return_value=None)

    def db_getitem(name):
        if name == "merchant_agreements":
            return mock_agreements
        if name == "canteens":
            return mock_canteens
        if name == "restaurants":
            return mock_restaurants
        return MagicMock()

    with patch("app.routers.partner.database") as mock_db:
        mock_db.__getitem__.side_effect = db_getitem

        resp = client.get("/api/partner/agreement/download-pdf/unknown-canteen")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

