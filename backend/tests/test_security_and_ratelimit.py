"""Unit tests for Step 4.3: Production Security Hardening, Rate Limiting, and CORS."""

import time
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from starlette.requests import Request

from app.main import app
from app.core.rate_limiter import limiter, get_real_client_ip
from app.core.security import (
    SECRET_KEY,
    ALGORITHM,
    create_access_token,
    decode_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    verify_token_integrity,
)


@pytest.fixture
def client():
    # Reset limiter storage before each test so rates are fresh
    try:
        limiter.reset()
    except Exception:
        pass
    return TestClient(app)


def test_get_real_client_ip_handles_proxies():
    """Verify get_real_client_ip accurately extracts client IP behind Cloudflare/Render reverse proxies."""
    # 1. With X-Forwarded-For header
    scope = {
        "type": "http",
        "headers": [(b"x-forwarded-for", b"203.0.113.195, 70.41.3.18, 150.172.238.178")],
        "client": ("10.0.0.1", 12345),
    }
    req = Request(scope)
    assert get_real_client_ip(req) == "203.0.113.195"

    # 2. Single IP in X-Forwarded-For
    scope_single = {
        "type": "http",
        "headers": [(b"x-forwarded-for", b"198.51.100.42")],
        "client": ("10.0.0.1", 12345),
    }
    req_single = Request(scope_single)
    assert get_real_client_ip(req_single) == "198.51.100.42"

    # 3. Direct client without proxy headers
    scope_direct = {
        "type": "http",
        "headers": [],
        "client": ("192.168.1.100", 54321),
    }
    req_direct = Request(scope_direct)
    assert get_real_client_ip(req_direct) == "192.168.1.100"


def test_auth_login_rate_limit_exceeded(client):
    """Verify hitting /auth/login more than 5 times in a minute triggers 429 Too Many Requests."""
    try:
        limiter.reset()
    except Exception:
        pass

    with patch("app.routes.auth.get_user_by_email", new_callable=AsyncMock) as mock_user:
        mock_user.return_value = None  # user not found -> 401

        # First 5 attempts return 401
        for i in range(5):
            res = client.post(
                "/auth/login",
                json={"email": f"test{i}@campusbite.com", "password": "wrongpassword"},
                headers={"X-Forwarded-For": "203.0.113.50"},
            )
            assert res.status_code == 401, f"Attempt {i+1} should return 401, got {res.status_code}"

        # 6th attempt should be blocked with 429 Too Many Requests
        res_blocked = client.post(
            "/auth/login",
            json={"email": "test6@campusbite.com", "password": "wrongpassword"},
            headers={"X-Forwarded-For": "203.0.113.50"},
        )
        assert res_blocked.status_code == 429
        assert "rate limit" in res_blocked.text.lower() or "too many requests" in res_blocked.text.lower()


def test_cors_preflight_production_origins(client):
    """Verify CORS preflight responds with proper allowed origins and rejects unauthorized origins."""
    # 1. Allowed origin: https://campusbite.vercel.app
    res_allowed = client.options(
        "/auth/login",
        headers={
            "Origin": "https://campusbite.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
    )
    assert res_allowed.status_code in (200, 204)
    assert res_allowed.headers.get("access-control-allow-origin") == "https://campusbite.vercel.app"
    assert res_allowed.headers.get("access-control-allow-credentials") == "true"
    assert "max-age" in res_allowed.headers or "access-control-max-age" in res_allowed.headers

    # 2. Allowed origin: http://localhost:3000
    res_local = client.options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res_local.status_code in (200, 204)
    assert res_local.headers.get("access-control-allow-origin") == "http://localhost:3000"

    # 3. Disallowed origin: https://evil-phishing-site.com
    res_disallowed = client.options(
        "/auth/login",
        headers={
            "Origin": "https://evil-phishing-site.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res_disallowed.headers.get("access-control-allow-origin") != "https://evil-phishing-site.com"


def test_jwt_integrity_valid_token():
    """Verify valid HS256 tokens decode successfully."""
    payload = {"sub": "user_123", "role": "customer", "email": "student@zeal.edu.in"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)

    assert decoded is not None
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == "customer"
    assert "exp" in decoded


def test_jwt_integrity_rejects_none_algorithm():
    """Verify tokens signed with 'none' algorithm are strictly rejected."""
    import base64
    # Manually craft an unverified token with alg: none to simulate attacker bypass
    header_b64 = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip("=")
    claims_b64 = base64.urlsafe_b64encode(b'{"sub":"attacker","role":"admin","exp":1893456000}').decode().rstrip("=")
    spoofed_token = f"{header_b64}.{claims_b64}."

    decoded = decode_access_token(spoofed_token)
    assert decoded is None, "Token with 'none' algorithm must be rejected"


def test_jwt_integrity_rejects_non_hs256_algorithms():
    """Verify tokens with algorithms other than HS256 are rejected."""
    # Attempt HS384 / HS512 / RS256
    token_hs384 = jwt.encode(
        {"sub": "user_456", "exp": int(time.time()) + 3600},
        SECRET_KEY,
        algorithm="HS384",
    )
    decoded = decode_access_token(token_hs384)
    assert decoded is None, "HS384 token must be rejected"


def test_jwt_integrity_rejects_expired_tokens():
    """Verify expired tokens are rejected."""
    past_exp = datetime.now(UTC) - timedelta(minutes=10)
    expired_token = jwt.encode(
        {"sub": "user_789", "role": "customer", "exp": past_exp},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    decoded = decode_access_token(expired_token)
    assert decoded is None, "Expired token must be rejected"


def test_password_reset_token_integrity():
    """Verify password reset tokens strictly validate HS256, type, and expiration."""
    import base64
    valid_token = create_password_reset_token("student@zeal.edu.in", "customer")
    decoded = decode_password_reset_token(valid_token)
    assert decoded is not None
    assert decoded["sub"] == "student@zeal.edu.in"
    assert decoded["type"] == "password_reset"

    # Expired reset token
    past_exp = datetime.now(UTC) - timedelta(minutes=30)
    expired_reset = jwt.encode(
        {"sub": "student@zeal.edu.in", "role": "customer", "type": "password_reset", "exp": past_exp},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    assert decode_password_reset_token(expired_reset) is None

    # Reset token with none alg
    header_b64 = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip("=")
    claims_b64 = base64.urlsafe_b64encode(b'{"sub":"student@zeal.edu.in","role":"customer","type":"password_reset","exp":1893456000}').decode().rstrip("=")
    spoofed_reset = f"{header_b64}.{claims_b64}."
    assert decode_password_reset_token(spoofed_reset) is None
