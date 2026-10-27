"""Unit and integration tests for Delivery Partner / Campus Runner Click-Wrap Agreement and PDF Export."""

from __future__ import annotations

import hashlib
import io
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.auth.roles import ADMIN, DELIVERY_PARTNER
from app.auth.security import create_access_token
from app.schemas.runner_agreement import RunnerAgreementAcceptance
from app.routers.delivery import (
    RUNNER_TERMS_HASH,
    RUNNER_TERMS_TEXT_V1,
    ensure_runner_agreement_signed,
)
from app.services.pdf_generator import generate_runner_agreement_pdf


def test_runner_terms_hash_calculation():
    """Verify that RUNNER_TERMS_HASH is the correct SHA-256 of RUNNER_TERMS_TEXT_V1."""
    expected = hashlib.sha256(RUNNER_TERMS_TEXT_V1.encode("utf-8")).hexdigest()
    assert RUNNER_TERMS_HASH == expected
    assert "Independent Campus Associate" in RUNNER_TERMS_TEXT_V1 or "INDEPENDENT ASSOCIATE STATUS" in RUNNER_TERMS_TEXT_V1
    assert "Zero Room Entry" in RUNNER_TERMS_TEXT_V1 or "Gate / Lobby Drop" in RUNNER_TERMS_TEXT_V1
    assert "500" in RUNNER_TERMS_TEXT_V1
    assert "Internship" in RUNNER_TERMS_TEXT_V1
    assert "Section 10A" in RUNNER_TERMS_TEXT_V1


def test_schema_valid_runner_agreement():
    """Validates that a complete and correct payload passes Pydantic validation."""
    payload = RunnerAgreementAcceptance(
        runner_id="runner-zeal-01",
        full_name="  Aman Sharma  ",
        phone="9876543210",
        emergency_contact="9876500000",
        college_id_or_seat_no="2024CS042",
        hostel_block_or_address="Aryabhatta Hall B-204",
        upi_id="aman.sharma@okaxis",
    )
    assert payload.full_name == "Aman Sharma"  # whitespace stripped
    assert payload.terms_version == "v1.0_RUNNER_2026_OCT"
    assert payload.status == "LEGALLY_EXECUTED"
    assert payload.upi_id == "aman.sharma@okaxis"


def test_schema_invalid_phone_and_emergency():
    """Validates 10-digit mobile number rules for runner and emergency contacts."""
    # Phone starting with invalid digit 4
    with pytest.raises(ValidationError):
        RunnerAgreementAcceptance(
            runner_id="runner-01",
            full_name="Aman Sharma",
            phone="4876543210",
            emergency_contact="9876500000",
            college_id_or_seat_no="2024CS042",
            hostel_block_or_address="Hostel B",
            upi_id="aman@upi",
        )

    # Emergency contact not 10 digits
    with pytest.raises(ValidationError):
        RunnerAgreementAcceptance(
            runner_id="runner-01",
            full_name="Aman Sharma",
            phone="9876543210",
            emergency_contact="98765",
            college_id_or_seat_no="2024CS042",
            hostel_block_or_address="Hostel B",
            upi_id="aman@upi",
        )


def test_schema_invalid_upi_id():
    """Validates regex pattern for UPI handles."""
    with pytest.raises(ValidationError):
        RunnerAgreementAcceptance(
            runner_id="runner-01",
            full_name="Aman Sharma",
            phone="9876543210",
            emergency_contact="9876500000",
            college_id_or_seat_no="2024CS042",
            hostel_block_or_address="Hostel B",
            upi_id="invalid_upi_without_handle",
        )


def test_schema_invalid_name_and_college_id():
    """Validates minimum length for name and college ID."""
    # Name too short
    with pytest.raises(ValidationError):
        RunnerAgreementAcceptance(
            runner_id="runner-01",
            full_name="Am",
            phone="9876543210",
            emergency_contact="9876500000",
            college_id_or_seat_no="2024CS042",
            hostel_block_or_address="Hostel B",
            upi_id="aman@upi",
        )

    # College ID too short
    with pytest.raises(ValidationError):
        RunnerAgreementAcceptance(
            runner_id="runner-01",
            full_name="Aman Sharma",
            phone="9876543210",
            emergency_contact="9876500000",
            college_id_or_seat_no="12",
            hostel_block_or_address="Hostel B",
            upi_id="aman@upi",
        )


@pytest.mark.asyncio
async def test_ensure_runner_agreement_signed_guard_blocks_unsigned():
    """Guard dependency must raise HTTP 403 if agreement_signed is not True."""
    from fastapi import HTTPException

    mock_runner = {
        "_id": "runner-01",
        "phone": "9876543210",
        "email": "runner@campus.edu",
        "agreement_signed": False,
    }

    with patch("app.routers.delivery.database") as mock_db:
        mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=mock_runner)

        user = {
            "role": DELIVERY_PARTNER,
            "phone": "9876543210",
            "email": "runner@campus.edu",
            "sub": "runner@campus.edu",
        }
        with pytest.raises(HTTPException) as exc_info:
            await ensure_runner_agreement_signed(current_user=user)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Delivery Partner agreement pending signature"


@pytest.mark.asyncio
async def test_ensure_runner_agreement_signed_guard_allows_signed():
    """Guard dependency must allow access if agreement_signed is True."""
    mock_runner = {
        "_id": "runner-01",
        "phone": "9876543210",
        "email": "runner@campus.edu",
        "agreement_signed": True,
        "upi_id": "runner@okaxis",
    }

    with patch("app.routers.delivery.database") as mock_db:
        mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=mock_runner)

        user = {
            "role": DELIVERY_PARTNER,
            "phone": "9876543210",
            "email": "runner@campus.edu",
            "sub": "runner@campus.edu",
        }
        result = await ensure_runner_agreement_signed(current_user=user)
        assert result == user


@pytest.mark.asyncio
async def test_ensure_runner_agreement_signed_allows_admin():
    """Admin users must bypass the agreement signature requirement."""
    admin_user = {"role": ADMIN, "email": "admin@campusbite.com", "sub": "admin"}
    result = await ensure_runner_agreement_signed(current_user=admin_user)
    assert result == admin_user


def test_generate_runner_agreement_pdf_buffer():
    """Verify that generate_runner_agreement_pdf produces a valid PDF buffer with %PDF- header."""
    mock_agreement = {
        "runner_id": "runner-01",
        "full_name": "Aman Runner",
        "phone": "9876543210",
        "emergency_contact": "9876500000",
        "college_id_or_seat_no": "2024CS042",
        "hostel_block_or_address": "Aryabhatta Hall B",
        "upi_id": "aman@okaxis",
        "terms_version": "v1.0_RUNNER_2026_OCT",
        "agreement_hash": RUNNER_TERMS_HASH,
        "accepted_at": datetime(2026, 10, 27, 19, 0, 0, tzinfo=timezone.utc),
        "ip_address": "192.168.1.15",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "status": "LEGALLY_EXECUTED",
    }
    mock_runner = {
        "_id": "runner-01",
        "name": "Aman Runner",
        "phone": "9876543210",
        "college_id": "2024CS042",
        "upi_id": "aman@okaxis",
    }

    pdf_buffer = generate_runner_agreement_pdf(mock_agreement, mock_runner)

    assert isinstance(pdf_buffer, io.BytesIO)
    pdf_bytes = pdf_buffer.getvalue()
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")
    assert b"%%EOF" in pdf_bytes[-1024:]


def test_download_runner_agreement_pdf_endpoint_success():
    """Verify GET /api/delivery/agreement/download-pdf/{runner_id} returns 200 with PDF streaming."""
    mock_agreement = {
        "runner_id": "runner-01",
        "full_name": "Aman Runner",
        "phone": "9876543210",
        "emergency_contact": "9876500000",
        "college_id_or_seat_no": "2024CS042",
        "hostel_block_or_address": "Aryabhatta Hall B",
        "upi_id": "aman@okaxis",
        "terms_version": "v1.0_RUNNER_2026_OCT",
        "agreement_hash": RUNNER_TERMS_HASH,
        "accepted_at": datetime(2026, 10, 27, 19, 0, 0, tzinfo=timezone.utc),
        "ip_address": "192.168.1.15",
        "user_agent": "Mozilla/5.0",
        "status": "LEGALLY_EXECUTED",
    }
    mock_runner = {
        "_id": "runner-01",
        "name": "Aman Runner",
        "phone": "9876543210",
    }

    client = TestClient(app)

    mock_agreements = MagicMock()
    mock_agreements.find_one = AsyncMock(return_value=mock_agreement)
    mock_runners = MagicMock()
    mock_runners.find_one = AsyncMock(return_value=mock_runner)

    def db_getitem(name):
        if name == "runner_agreements":
            return mock_agreements
        if name in ("delivery_partners", "runners", "users"):
            return mock_runners
        return MagicMock()

    with patch("app.routers.delivery.database") as mock_db:
        mock_db.__getitem__.side_effect = db_getitem

        resp = client.get("/api/delivery/agreement/download-pdf/runner-01")

        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert 'attachment; filename="CampusBite_Runner_Agreement_Aman_Runner.pdf"' in resp.headers.get("content-disposition", "")
        assert resp.content.startswith(b"%PDF-")
        assert len(resp.content) > 1000


def test_download_runner_agreement_pdf_endpoint_not_found():
    """Verify GET /api/delivery/agreement/download-pdf/{runner_id} returns 404 when no agreement exists."""
    client = TestClient(app)

    mock_agreements = MagicMock()
    mock_agreements.find_one = AsyncMock(return_value=None)
    mock_runners = MagicMock()
    mock_runners.find_one = AsyncMock(return_value=None)

    def db_getitem(name):
        if name == "runner_agreements":
            return mock_agreements
        if name in ("delivery_partners", "runners", "users"):
            return mock_runners
        return MagicMock()

    with patch("app.routers.delivery.database") as mock_db:
        mock_db.__getitem__.side_effect = db_getitem

        resp = client.get("/api/delivery/agreement/download-pdf/unknown-runner")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


def test_accept_runner_agreement_endpoint():
    """Verify POST /api/delivery/accept-agreement records audit record and updates collections."""
    client = TestClient(app)

    mock_agreements = MagicMock()
    mock_agreements.insert_one = AsyncMock(return_value=MagicMock())
    mock_runners = MagicMock()
    mock_runners.update_many = AsyncMock(return_value=MagicMock())

    def db_getitem(name):
        if name == "runner_agreements":
            return mock_agreements
        if name in ("delivery_partners", "runners", "users"):
            return mock_runners
        return MagicMock()

    with patch("app.routers.delivery.database") as mock_db:
        mock_db.__getitem__.side_effect = db_getitem

        payload = {
            "runner_id": "runner-01",
            "full_name": "Aman Runner",
            "phone": "9876543210",
            "emergency_contact": "9876500000",
            "college_id_or_seat_no": "2024CS042",
            "hostel_block_or_address": "Aryabhatta Hall B",
            "upi_id": "aman@okaxis",
            "terms_version": "v1.0_RUNNER_2026_OCT",
            "status": "LEGALLY_EXECUTED",
        }

        resp = client.post("/api/delivery/accept-agreement", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["agreement_hash"] == RUNNER_TERMS_HASH
        assert mock_agreements.insert_one.called
        assert mock_runners.update_many.called


def test_guarded_orders_available_blocks_unsigned():
    """Verify GET /api/delivery/orders/available returns 403 when runner agreement is unsigned."""
    client = TestClient(app)

    token = create_access_token({
        "sub": "runner@campus.edu",
        "phone": "9876543210",
        "role": DELIVERY_PARTNER,
    })

    mock_runner = {
        "_id": "runner-01",
        "phone": "9876543210",
        "email": "runner@campus.edu",
        "agreement_signed": False,
    }

    mock_runners = MagicMock()
    mock_runners.find_one = AsyncMock(return_value=mock_runner)

    def db_getitem(name):
        return mock_runners

    with patch("app.routers.delivery.database") as mock_db:
        mock_db.__getitem__.side_effect = db_getitem

        resp = client.get(
            "/api/delivery/orders/available",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Delivery Partner agreement pending signature"
