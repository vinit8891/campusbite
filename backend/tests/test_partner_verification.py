"""Unit and integration tests for Flexible Multi-Tier Partner Onboarding & Admin Verification."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.roles import ADMIN, CUSTOMER, DELIVERY_PARTNER
from app.auth.security import create_access_token
from app.schemas.partner_onboarding import (
    CourierOnboardingRequest,
    CourierType,
    RestaurantOnboardingRequest,
    VendorType,
    VerificationStatus,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token():
    return create_access_token({"sub": "admin@campusbite.com", "role": ADMIN, "email": "admin@campusbite.com"})


@pytest.fixture
def customer_token():
    return create_access_token({"sub": "cust_123", "role": CUSTOMER, "email": "student@campus.edu", "phone": "9876543210"})


@pytest.fixture
def courier_token():
    return create_access_token({"sub": "courier_123", "role": DELIVERY_PARTNER, "email": "runner@campus.edu", "phone": "9876500001"})


def test_schema_home_tiffin_aadhaar_validation():
    """Validates schema requirements for a Home Tiffin service."""
    payload = {
        "vendor_type": "HOME_TIFFIN",
        "business_name": "Sharma Aunty Home Tiffins",
        "owner_name": "Sunita Sharma",
        "phone": "9876543211",
        "email": "sharma.tiffins@example.com",
        "password": "securepassword123",
        "address_or_stall_landmark": "Flat 402, Ganga Heights, Near North Gate",
        "is_inside_campus": False,
        "compliance_doc_type": "AADHAAR_KYC",
        "compliance_doc_url": "/uploads/kyc/sharma_aadhaar.pdf",
        "kitchen_or_stall_photo_url": "/uploads/kyc/sharma_kitchen.jpg",
        "bank_account_holder": "Sunita Sharma",
        "bank_account_number": "123456789012",
        "bank_ifsc_code": "SBIN0001234",
        "settlement_upi_id": "sharmatiffins@oksbi",
    }
    req = RestaurantOnboardingRequest(**payload)
    assert req.vendor_type == VendorType.HOME_TIFFIN
    assert req.is_inside_campus is False
    assert req.bank_ifsc_code == "SBIN0001234"


def test_schema_external_gig_courier_validation():
    """Validates schema requirements for an External Gig courier."""
    payload = {
        "courier_type": "EXTERNAL_GIG",
        "full_name": "Ramesh Kumar",
        "phone": "9876500099",
        "email": "ramesh.courier@example.com",
        "password": "securepassword123",
        "transit_mode": "MOTORCYCLE",
        "id_proof_type": "DRIVING_LICENSE",
        "id_proof_doc_url": "/uploads/kyc/ramesh_dl.pdf",
        "vehicle_number": "UP32AB1234",
        "payout_upi_id": "ramesh@paytm",
        "emergency_contact_phone": "9876500000",
    }
    req = CourierOnboardingRequest(**payload)
    assert req.courier_type == CourierType.EXTERNAL_GIG
    assert req.transit_mode.value == "MOTORCYCLE"
    assert req.student_details is None


def test_schema_student_courier_requires_student_details():
    """Asserts student couriers must provide student details (roll no, hostel, year)."""
    payload = {
        "courier_type": "STUDENT",
        "full_name": "Aman Verma",
        "phone": "9876500088",
        "email": "aman.student@campus.edu",
        "password": "securepassword123",
        "transit_mode": "BICYCLE",
        "id_proof_type": "STUDENT_ID",
        "id_proof_doc_url": "/uploads/kyc/aman_id.jpg",
        "payout_upi_id": "aman@upi",
        "emergency_contact_phone": "9876500000",
    }
    with pytest.raises(ValueError, match="student_details"):
        CourierOnboardingRequest(**payload)


@pytest.mark.asyncio
async def test_onboard_restaurant_endpoint(client):
    """Tests POST /restaurant/onboard endpoint inserts doc in PENDING_VERIFICATION state."""
    mock_restaurants = MagicMock()
    mock_restaurant_owners = MagicMock()

    mock_restaurants.find_one = AsyncMock(return_value=None)
    mock_restaurant_owners.find_one = AsyncMock(return_value=None)
    fake_id = ObjectId()
    mock_restaurants.insert_one = AsyncMock(return_value=MagicMock(inserted_id=fake_id))
    mock_restaurant_owners.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

    mock_db = {
        "restaurants": mock_restaurants,
        "restaurant_owners": mock_restaurant_owners,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            "/restaurant/onboard",
            json={
                "vendor_type": "HOME_TIFFIN",
                "business_name": "Sharma Aunty Home Tiffins",
                "owner_name": "Sunita Sharma",
                "phone": "9876543211",
                "email": "sharma.tiffins@example.com",
                "password": "securepassword123",
                "address_or_stall_landmark": "Flat 402, Ganga Heights",
                "is_inside_campus": False,
                "compliance_doc_type": "AADHAAR_KYC",
                "compliance_doc_url": "/uploads/kyc/sharma_aadhaar.pdf",
                "kitchen_or_stall_photo_url": "/uploads/kyc/sharma_kitchen.jpg",
                "bank_account_holder": "Sunita Sharma",
                "bank_account_number": "123456789012",
                "bank_ifsc_code": "SBIN0001234",
                "settlement_upi_id": "sharmatiffins@oksbi",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["verification_status"] == VerificationStatus.PENDING_VERIFICATION.value
        assert data["id"] == str(fake_id)


@pytest.mark.asyncio
async def test_onboard_courier_endpoint(client):
    """Tests POST /delivery/onboard endpoint inserts doc in PENDING_VERIFICATION state."""
    mock_couriers = MagicMock()
    mock_couriers.find_one = AsyncMock(return_value=None)
    fake_id = ObjectId()
    mock_couriers.insert_one = AsyncMock(return_value=MagicMock(inserted_id=fake_id))

    mock_db = {
        "delivery_partners": mock_couriers,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            "/delivery/onboard",
            json={
                "courier_type": "STUDENT",
                "full_name": "Aman Verma",
                "phone": "9876500088",
                "email": "aman.student@campus.edu",
                "password": "securepassword123",
                "transit_mode": "BICYCLE",
                "id_proof_type": "STUDENT_ID",
                "id_proof_doc_url": "/uploads/kyc/aman_id.jpg",
                "student_details": {
                    "roll_no": "2024CS01",
                    "hostel_block": "Aryabhatta Hall B",
                    "year": "3rd Year",
                },
                "payout_upi_id": "aman@upi",
                "emergency_contact_phone": "9876500000",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["verification_status"] == VerificationStatus.PENDING_VERIFICATION.value


@pytest.mark.asyncio
async def test_admin_verification_decision_approval(client, admin_token):
    """Tests admin approving a partner transitions status to APPROVED and activates account."""
    mock_restaurants = MagicMock()
    mock_owners = MagicMock()
    fake_id = ObjectId()

    mock_restaurants.find_one_and_update = AsyncMock(
        return_value={"_id": fake_id, "name": "Sharma Aunty Home Tiffins", "verification_status": "APPROVED"}
    )
    mock_owners.update_many = AsyncMock()

    mock_db = {
        "restaurants": mock_restaurants,
        "restaurant_owners": mock_owners,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            f"/admin/verifications/restaurant/{fake_id}/decision",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "APPROVE"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["verification_status"] == "APPROVED"


@pytest.mark.asyncio
async def test_platform_guard_blocks_unapproved_restaurant_orders(client, customer_token):
    """Tests that customers cannot place orders for restaurants with PENDING_VERIFICATION status."""
    mock_restaurant = {
        "email": "pending_canteen@campusbite.com",
        "verification_status": "PENDING_VERIFICATION",
    }

    with patch("app.models.restaurant.get_restaurant_by_email", new=AsyncMock(return_value=mock_restaurant)):
        resp = client.post(
            "/orders/",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "customer_name": "Student",
                "phone": "9876543210",
                "restaurant_name": "Pending Canteen",
                "restaurant_email": "pending_canteen@campusbite.com",
                "address": "Hostel 4",
                "hostel_block": "H4",
                "total": 98.0,
                "items": [{"id": "item1", "name": "Thali", "price": 80.0, "quantity": 1}],
                "payment_method": "COD",
                "delivery_type": "HOSTEL_BATCH",
                "order_type": "DELIVERY",
            },
        )
        assert resp.status_code == 403
        assert "not approved" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_platform_guard_blocks_unapproved_courier_access(client, courier_token):
    """Tests that unapproved couriers cannot view available orders or claim runs."""
    mock_courier = {
        "phone": "9876500001",
        "verification_status": "PENDING_VERIFICATION",
    }

    with patch("app.models.delivery_partner.get_delivery_partner_by_phone", new=AsyncMock(return_value=mock_courier)):
        resp = client.get(
            "/orders/delivery/available",
            headers={"Authorization": f"Bearer {courier_token}"},
        )
        assert resp.status_code == 403
        assert "pending verification" in resp.json()["detail"].lower()
