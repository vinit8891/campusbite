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


@pytest.mark.asyncio
async def test_admin_get_pending_verifications_returns_counts(client, admin_token):
    """Tests that GET /admin/verifications/pending returns explicit counts dictionary and category arrays."""
    fake_rest_id = ObjectId()
    fake_courier_id = ObjectId()

    mock_rest_docs = [
        {
            "_id": fake_rest_id,
            "name": "Campus Canteen 1",
            "vendor_type": "CAMPUS_CANTEEN",
            "verification_status": "PENDING_VERIFICATION",
            "email": "canteen@campus.edu",
            "phone": "9876543210",
        }
    ]
    mock_courier_docs = [
        {
            "_id": fake_courier_id,
            "full_name": "Student Runner 1",
            "courier_type": "STUDENT",
            "verification_status": "PENDING_VERIFICATION",
            "email": "runner@campus.edu",
            "phone": "9876500001",
        }
    ]

    mock_restaurants = MagicMock()
    mock_delivery = MagicMock()

    class FakeCursor:
        def __init__(self, docs):
            self.docs = docs

        def sort(self, *args, **kwargs):
            return self

        def __iter__(self):
            return iter(self.docs)

    mock_restaurants.find = MagicMock(return_value=FakeCursor(mock_rest_docs))
    mock_delivery.find = MagicMock(return_value=FakeCursor(mock_courier_docs))

    mock_db = {
        "restaurants": mock_restaurants,
        "delivery_partners": mock_delivery,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.get(
            "/admin/verifications/pending",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "counts" in data
        assert data["counts"]["all"] == 2
        assert data["counts"]["canteens"] == 1
        assert data["counts"]["tiffins"] == 0
        assert data["counts"]["stalls"] == 0
        assert data["counts"]["students"] == 1
        assert data["counts"]["externals"] == 0
        assert len(data["items"]) == 2
        assert len(data["canteens"]) == 1
        assert len(data["students"]) == 1


@pytest.mark.asyncio
async def test_onboard_restaurant_enforces_unverified_defaults(client):
    """Verifies that newly registered restaurant has is_verified=False, verification_status='pending', is_active=False."""
    mock_restaurants = MagicMock()
    mock_owners = MagicMock()
    mock_restaurants.find_one = AsyncMock(return_value=None)
    mock_owners.find_one = AsyncMock(return_value=None)
    fake_id = ObjectId()
    mock_restaurants.insert_one = AsyncMock(return_value=MagicMock(inserted_id=fake_id))
    mock_owners.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

    mock_db = {
        "restaurants": mock_restaurants,
        "restaurant_owners": mock_owners,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            "/restaurant/onboard",
            json={
                "vendor_type": "CAMPUS_CANTEEN",
                "business_name": "Campus Night Canteen",
                "owner_name": "Ramesh Gupta",
                "phone": "9876543299",
                "email": "nightcanteen@campus.edu",
                "password": "securepassword123",
                "address_or_stall_landmark": "Near Hostel 7 Ground",
                "is_inside_campus": True,
                "compliance_doc_type": "COLLEGE_PERMIT",
                "compliance_doc_url": "/uploads/kyc/permit.pdf",
                "kitchen_or_stall_photo_url": "/uploads/kyc/kitchen.jpg",
                "bank_account_holder": "Ramesh Gupta",
                "bank_account_number": "987654321098",
                "bank_ifsc_code": "SBIN0004321",
                "settlement_upi_id": "nightcanteen@upi",
            },
        )
        assert resp.status_code == 200
        inserted_doc = mock_restaurants.insert_one.call_args[0][0]
        assert inserted_doc["is_verified"] is False
        assert inserted_doc["verification_status"] == "pending"
        assert inserted_doc["is_active"] is False


@pytest.mark.asyncio
async def test_admin_direct_approval_handler(client, admin_token):
    """Verifies POST /admin/verifications/{id}/approve updates MongoDB with approved flags and timestamp."""
    mock_restaurants = MagicMock()
    mock_owners = MagicMock()
    fake_id = ObjectId()

    mock_restaurants.find_one_and_update = AsyncMock(
        return_value={"_id": fake_id, "name": "Campus Night Canteen", "verification_status": "approved"}
    )
    mock_owners.update_many = AsyncMock()

    mock_db = {
        "restaurants": mock_restaurants,
        "restaurant_owners": mock_owners,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            f"/admin/verifications/{fake_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["verification_status"] == "approved"
        assert data["is_verified"] is True
        assert data["is_active"] is True

        called_set = mock_restaurants.find_one_and_update.call_args[0][1]["$set"]
        assert called_set["verification_status"] == "approved"
        assert called_set["is_verified"] is True
        assert called_set["is_active"] is True
        assert "verified_at" in called_set


@pytest.mark.asyncio
async def test_public_storefront_filters_unapproved_restaurants(client):
    """Verifies public GET /restaurants/ query filters by verification status and active state."""
    captured_queries = []

    class FakeCursor:
        def __init__(self, docs):
            self.docs = docs
        def sort(self, *args, **kwargs):
            return self
        def skip(self, *args, **kwargs):
            return self
        def limit(self, *args, **kwargs):
            return self
        def __aiter__(self):
            return self._gen()
        async def _gen(self):
            for d in self.docs:
                yield d

    def fake_find(query):
        captured_queries.append(query)
        return FakeCursor([
            {
                "_id": ObjectId(),
                "name": "Approved Canteen",
                "email": "approved@canteen.edu",
                "is_verified": True,
                "verification_status": "approved",
                "is_active": True,
            }
        ])

    with patch("app.models.restaurant.restaurant_collection.find", side_effect=fake_find), \
         patch("app.models.restaurant.menu_collection.find", return_value=FakeCursor([])), \
         patch("app.models.restaurant.restaurant_collection.count_documents", new=AsyncMock(return_value=1)):
        resp = client.get("/restaurants/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1

        assert len(captured_queries) == 1
        query = captured_queries[0]
        assert query.get("is_active") is True
        assert "$or" in query
        or_conditions = query["$or"]
        assert {"verification_status": "approved"} in or_conditions or {"is_verified": True} in or_conditions


@pytest.mark.asyncio
async def test_courier_registration_defaults_enforced(client):
    """Verifies that courier registration sets is_verified=False, verification_status='pending', is_active=False, is_on_duty=False."""
    with patch("app.routes.delivery_auth.get_delivery_partner_by_email", new=AsyncMock(return_value=None)), \
         patch("app.routes.delivery_auth.get_delivery_partner_by_phone", new=AsyncMock(return_value=None)), \
         patch("app.routes.delivery_auth.create_delivery_partner", new=AsyncMock(return_value="courier_123")) as mock_create, \
         patch("app.models.delivery_partner.get_delivery_partner_by_email", new=AsyncMock(return_value=None)), \
         patch("app.models.delivery_partner.get_delivery_partner_by_phone", new=AsyncMock(return_value=None)), \
         patch("app.models.delivery_partner.create_delivery_partner", new=AsyncMock(return_value="courier_123")):
        resp = client.post(
            "/delivery/register",
            json={
                "name": "Student Runner",
                "email": "runner.student@campus.edu",
                "phone": "9876543219",
                "password": "strongPassword123",
                "vehicle": "Bicycle",
                "vehicle_number": "UP32AB1234",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_verified"] is False
        assert data["verification_status"] == "pending"
        assert data["is_active"] is False
        assert data["is_on_duty"] is False

        created_doc = mock_create.call_args[0][0]
        assert created_doc["is_verified"] is False
        assert created_doc["verification_status"] == "pending"
        assert created_doc["is_active"] is False
        assert created_doc["is_on_duty"] is False


@pytest.mark.asyncio
async def test_api_partner_courier_registration_defaults_enforced(client):
    """Verifies that courier registration via /api/partner/courier sets unverified defaults."""
    mock_couriers = MagicMock()
    mock_couriers.find_one = AsyncMock(return_value=None)
    fake_id = ObjectId()
    mock_couriers.insert_one = AsyncMock(return_value=MagicMock(inserted_id=fake_id))

    mock_db = {"delivery_partners": mock_couriers}

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            "/api/partner/courier",
            json={
                "courier_type": "STUDENT",
                "full_name": "Aman Runner",
                "phone": "9876500077",
                "email": "aman.runner@campus.edu",
                "password": "securepassword123",
                "transit_mode": "BICYCLE",
                "id_proof_type": "STUDENT_ID",
                "id_proof_doc_url": "/uploads/kyc/aman_id.jpg",
                "student_details": {
                    "roll_no": "2024CS02",
                    "hostel_block": "Aryabhatta Hall B",
                    "year": "2nd Year",
                },
                "payout_upi_id": "aman@upi",
                "emergency_contact_phone": "9876500000",
            },
        )
        assert resp.status_code == 200
        inserted_doc = mock_couriers.insert_one.call_args[0][0]
        assert inserted_doc["is_verified"] is False
        assert inserted_doc["verification_status"] == "pending"
        assert inserted_doc["is_active"] is False
        assert inserted_doc["is_on_duty"] is False


@pytest.mark.asyncio
async def test_guard_delivery_available_orders_blocks_unverified(client, courier_token):
    """Verifies GET /delivery/available blocks unapproved couriers with 403 Forbidden."""
    unverified_courier = {
        "phone": "9876500001",
        "email": "runner@campus.edu",
        "verification_status": "pending",
        "is_verified": False,
    }

    with patch("app.models.delivery_partner.get_delivery_partner_by_phone", new=AsyncMock(return_value=unverified_courier)):
        resp = client.get(
            "/delivery/available",
            headers={"Authorization": f"Bearer {courier_token}"},
        )
        assert resp.status_code == 403
        assert "pending verification" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_guard_delivery_available_orders_allows_approved(client, courier_token):
    """Verifies GET /delivery/available allows approved courier."""
    approved_courier = {
        "phone": "9876500001",
        "email": "runner@campus.edu",
        "verification_status": "approved",
        "is_verified": True,
        "is_active": True,
    }

    with patch("app.models.delivery_partner.get_delivery_partner_by_phone", new=AsyncMock(return_value=approved_courier)), \
         patch("app.models.order.get_available_orders", new=AsyncMock(return_value={"items": [], "total": 0, "page": 1, "pages": 1})):
        resp = client.get(
            "/delivery/available",
            headers={"Authorization": f"Bearer {courier_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data or "orders" in data or "data" in data


@pytest.mark.asyncio
async def test_guard_delivery_duty_toggle_blocks_unverified(client, courier_token):
    """Verifies PUT /delivery/duty and PUT /delivery/status reject duty toggle with 403 if unverified."""
    unverified_courier = {
        "phone": "9876500001",
        "email": "runner@campus.edu",
        "verification_status": "pending",
        "is_verified": False,
    }

    with patch("app.models.delivery_partner.get_delivery_partner_by_phone", new=AsyncMock(return_value=unverified_courier)):
        resp = client.put(
            "/delivery/duty",
            headers={"Authorization": f"Bearer {courier_token}"},
            json={"online": True},
        )
        assert resp.status_code == 403
        assert "pending verification" in resp.json()["detail"].lower()

        resp2 = client.put(
            "/delivery/status",
            headers={"Authorization": f"Bearer {courier_token}"},
            json={"online": True},
        )
        assert resp2.status_code == 403


@pytest.mark.asyncio
async def test_guard_delivery_claim_order_blocks_unverified(client, courier_token):
    """Verifies POST /delivery/orders/{order_id}/claim rejects claim with 403 if courier is unverified."""
    unverified_courier = {
        "phone": "9876500001",
        "email": "runner@campus.edu",
        "verification_status": "pending",
        "is_verified": False,
    }

    with patch("app.models.delivery_partner.get_delivery_partner_by_phone", new=AsyncMock(return_value=unverified_courier)), \
         patch("app.routes.order.get_delivery_partner_by_phone", new=AsyncMock(return_value=unverified_courier)):
        resp = client.post(
            "/delivery/orders/order_12345/claim",
            headers={"Authorization": f"Bearer {courier_token}"},
            json={"name": "Runner", "phone": "9876500001"},
        )
        assert resp.status_code == 403
        assert "pending verification" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_approves_courier_sets_approved_at(client, admin_token):
    """Verifies admin approving a courier updates MongoDB with approved_at, is_verified, and is_active."""
    mock_restaurants = MagicMock()
    mock_delivery = MagicMock()
    fake_id = ObjectId()

    mock_restaurants.find_one_and_update = AsyncMock(return_value=None)
    mock_delivery.find_one_and_update = AsyncMock(
        return_value={"_id": fake_id, "full_name": "Student Runner", "verification_status": "approved"}
    )

    mock_db = {
        "restaurants": mock_restaurants,
        "delivery_partners": mock_delivery,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            f"/admin/verifications/{fake_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["is_verified"] is True
        assert data["is_active"] is True
        assert data["verification_status"] == "approved"

        called_set = mock_delivery.find_one_and_update.call_args[0][1]["$set"]
        assert called_set["verification_status"] == "approved"
        assert called_set["is_verified"] is True
        assert called_set["is_active"] is True
        assert "approved_at" in called_set


@pytest.mark.asyncio
async def test_restaurant_onboarding_address_and_coordinates(client):
    """Verifies RestaurantOnboardingRequest accepts address, stall_location, latitude, longitude."""
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
                "vendor_type": "CAMPUS_CANTEEN",
                "business_name": "Zeal Canteen",
                "owner_name": "Ramesh Patil",
                "phone": "9876543299",
                "email": "ramesh.zeal@example.com",
                "password": "securepassword123",
                "address": "Near Zeal College, Narhe / Ground Floor, Mess Hall",
                "latitude": 18.4485,
                "longitude": 73.8256,
                "is_inside_campus": True,
                "compliance_doc_type": "COLLEGE_PERMIT",
                "compliance_doc_url": "/uploads/kyc/permit.pdf",
                "kitchen_or_stall_photo_url": "/uploads/kyc/zeal_stall.jpg",
                "bank_account_holder": "Ramesh Patil",
                "bank_account_number": "123456789012",
                "bank_ifsc_code": "SBIN0001234",
                "settlement_upi_id": "zeal@upi",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

        # Check saved doc
        inserted_doc = mock_restaurants.insert_one.call_args[0][0]
        assert inserted_doc["address"] == "Near Zeal College, Narhe / Ground Floor, Mess Hall"
        assert inserted_doc["stall_location"] == "Near Zeal College, Narhe / Ground Floor, Mess Hall"
        assert inserted_doc["latitude"] == 18.4485
        assert inserted_doc["longitude"] == 73.8256


@pytest.mark.asyncio
async def test_courier_onboarding_address_and_coordinates(client):
    """Verifies CourierOnboardingRequest accepts address, residence_address, latitude, longitude."""
    mock_delivery = MagicMock()
    mock_delivery.find_one = AsyncMock(return_value=None)
    fake_id = ObjectId()
    mock_delivery.insert_one = AsyncMock(return_value=MagicMock(inserted_id=fake_id))

    mock_db = {
        "delivery_partners": mock_delivery,
    }

    with patch("app.routes.partner_onboarding.database", mock_db):
        resp = client.post(
            "/delivery/onboard",
            json={
                "courier_type": "STUDENT",
                "full_name": "Aman Runner",
                "phone": "9876500077",
                "email": "aman.runner@campus.edu",
                "password": "securepassword123",
                "transit_mode": "BICYCLE",
                "id_proof_type": "STUDENT_ID",
                "id_proof_doc_url": "/uploads/kyc/aman_id.jpg",
                "student_details": {
                    "roll_no": "2024CS09",
                    "hostel_block": "Sai Apartment, Narhe / Hostel Block B, Room 204",
                    "year": "2nd Year",
                },
                "latitude": 18.4490,
                "longitude": 73.8260,
                "payout_upi_id": "amanrunner@upi",
                "emergency_contact_phone": "9876500000",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

        inserted_doc = mock_delivery.insert_one.call_args[0][0]
        assert "Sai Apartment, Narhe" in inserted_doc["address"]
        assert inserted_doc["latitude"] == 18.4490
        assert inserted_doc["longitude"] == 73.8260




