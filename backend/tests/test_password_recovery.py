from datetime import datetime, timedelta, timezone
from app.auth.security import (
    create_password_reset_token,
    decode_password_reset_token,
    get_password_hash,
    verify_password,
)


def test_create_and_decode_password_reset_token():
    email = "testcustomer@example.com"
    role = "customer"

    token = create_password_reset_token(email=email, role=role)
    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_password_reset_token(token)
    assert payload is not None
    assert payload.get("sub") == email
    assert payload.get("role") == role
    assert payload.get("type") == "password_reset"


def test_decode_expired_password_reset_token():
    from jose import jwt
    from app.auth.security import SECRET_KEY, ALGORITHM

    expire = datetime.now(timezone.utc) - timedelta(minutes=5)
    to_encode = {
        "sub": "expired@example.com",
        "role": "customer",
        "type": "password_reset",
        "exp": expire,
    }
    expired_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    decoded = decode_password_reset_token(expired_token)
    assert decoded is None


def test_decode_invalid_type_token():
    from app.auth.security import create_access_token

    # Normal access token shouldn't decode as password_reset token
    access_token = create_access_token(data={"sub": "user@example.com", "role": "customer"})
    decoded = decode_password_reset_token(access_token)
    assert decoded is None


def test_password_hash_and_verify():
    password = "NewStrongPassword123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import BackgroundTasks
from app.routes.auth import forgot_password
from app.schemas.user import ForgotPasswordRequest


@pytest.mark.asyncio
async def test_forgot_password_frontend_url_from_env():
    """Verify forgot-password uses FRONTEND_URL env var when set."""
    payload = ForgotPasswordRequest(email="alice@example.com", role="customer")
    bg_tasks = BackgroundTasks()
    request = MagicMock()
    request.headers = {"origin": "https://ignored-origin.com"}

    mock_db = {
        "users": MagicMock()
    }
    mock_db["users"].find_one = AsyncMock(return_value={"_id": "usr_123", "name": "Alice", "email": "alice@example.com"})

    with patch.dict("os.environ", {"FRONTEND_URL": "https://custom-campusbite.in/"}), \
         patch("app.routes.auth.database", mock_db), \
         patch("app.routes.auth.schedule_notification") as mock_schedule:
        resp = await forgot_password(payload, bg_tasks, request)
        assert "message" in resp
        assert mock_schedule.called
        kwargs = mock_schedule.call_args.kwargs
        assert kwargs["reset_link"].startswith("https://custom-campusbite.in/reset-password?token=")
        assert "role=customer" in kwargs["reset_link"]


@pytest.mark.asyncio
async def test_forgot_password_frontend_url_from_origin_header():
    """Verify forgot-password extracts frontend URL from request origin header when FRONTEND_URL is unset."""
    payload = ForgotPasswordRequest(email="alice@example.com", role="customer")
    bg_tasks = BackgroundTasks()
    request = MagicMock()
    request.headers = {"origin": "https://deploy-preview-12.campusbite.app"}

    mock_db = {
        "users": MagicMock()
    }
    mock_db["users"].find_one = AsyncMock(return_value={"_id": "usr_123", "name": "Alice", "email": "alice@example.com"})

    with patch.dict("os.environ", {"FRONTEND_URL": ""}), \
         patch("app.routes.auth.database", mock_db), \
         patch("app.routes.auth.schedule_notification") as mock_schedule:
        resp = await forgot_password(payload, bg_tasks, request)
        assert "message" in resp
        assert mock_schedule.called
        kwargs = mock_schedule.call_args.kwargs
        assert kwargs["reset_link"].startswith("https://deploy-preview-12.campusbite.app/reset-password?token=")
        assert "role=customer" in kwargs["reset_link"]


@pytest.mark.asyncio
async def test_forgot_password_frontend_url_from_referer_header():
    """Verify forgot-password extracts base origin from referer header when origin and env are unset."""
    payload = ForgotPasswordRequest(email="alice@example.com", role="customer")
    bg_tasks = BackgroundTasks()
    request = MagicMock()
    request.headers = {"referer": "https://campusbite.org/auth/forgot-password?ref=login"}

    mock_db = {
        "users": MagicMock()
    }
    mock_db["users"].find_one = AsyncMock(return_value={"_id": "usr_123", "name": "Alice", "email": "alice@example.com"})

    with patch.dict("os.environ", {"FRONTEND_URL": ""}), \
         patch("app.routes.auth.database", mock_db), \
         patch("app.routes.auth.schedule_notification") as mock_schedule:
        resp = await forgot_password(payload, bg_tasks, request)
        assert "message" in resp
        assert mock_schedule.called
        kwargs = mock_schedule.call_args.kwargs
        assert kwargs["reset_link"].startswith("https://campusbite.org/reset-password?token=")
        assert "role=customer" in kwargs["reset_link"]


@pytest.mark.asyncio
async def test_forgot_password_frontend_url_fallback_default():
    """Verify forgot-password defaults to https://campusbite-beta.vercel.app when env and headers are empty."""
    payload = ForgotPasswordRequest(email="alice@example.com", role="customer")
    bg_tasks = BackgroundTasks()
    request = MagicMock()
    request.headers = {}

    mock_db = {
        "users": MagicMock()
    }
    mock_db["users"].find_one = AsyncMock(return_value={"_id": "usr_123", "name": "Alice", "email": "alice@example.com"})

    with patch.dict("os.environ", {"FRONTEND_URL": ""}), \
         patch("app.routes.auth.database", mock_db), \
         patch("app.routes.auth.schedule_notification") as mock_schedule:
        resp = await forgot_password(payload, bg_tasks, request)
        assert "message" in resp
        assert mock_schedule.called
        kwargs = mock_schedule.call_args.kwargs
        assert kwargs["reset_link"].startswith("https://campusbite-beta.vercel.app/reset-password?token=")
        assert "role=customer" in kwargs["reset_link"]

