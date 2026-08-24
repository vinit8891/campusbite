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

    expire = datetime.utcnow() - timedelta(minutes=5)
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
