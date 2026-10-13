"""Authentication Token Integrity Guard and cryptographic utilities.

- Verifies JWT signatures strictly reject algorithms other than HS256.
- Prevents 'none' algorithm spoofing.
- Enforces token expiration validation on all protected endpoints.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.auth.security import (
    SECRET_KEY,
    ALGORITHM,
    ALLOWED_ALGORITHMS,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    RESET_TOKEN_EXPIRE_MINUTES,
    hash_password,
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    create_password_reset_token,
    decode_password_reset_token,
)

__all__ = [
    "SECRET_KEY",
    "ALGORITHM",
    "ALLOWED_ALGORITHMS",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "RESET_TOKEN_EXPIRE_MINUTES",
    "hash_password",
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "decode_access_token",
    "create_password_reset_token",
    "decode_password_reset_token",
    "verify_token_integrity",
]


def verify_token_integrity(token: str, secret_key: str = SECRET_KEY) -> dict[str, Any] | None:
    """Explicitly verify JWT integrity and expiration.

    Rejects 'none' algorithm, non-HS256 algorithms, and expired tokens.
    """
    return decode_access_token(token)
