import os
from datetime import UTC, datetime, timedelta

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is required. "
        "Set it in backend/.env"
    )

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
):
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(UTC) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {"exp": expire}
    )

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


ALLOWED_ALGORITHMS = ["HS256"]


def decode_access_token(token: str) -> dict | None:
    """Validate and decode JWT access token with strict integrity checks.

    - Verifies algorithm is strictly HS256 (rejects 'none' and other algorithms).
    - Enforces expiration time claim (exp).
    """
    if not token or not isinstance(token, str):
        return None

    try:
        # Pre-check header to prevent algorithm spoofing (e.g. 'none' / None)
        header = jwt.get_unverified_header(token)
        alg = str(header.get("alg") or "").strip()
        if not alg or alg.lower() == "none" or alg not in ALLOWED_ALGORITHMS:
            return None

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=ALLOWED_ALGORITHMS,
            options={
                "verify_signature": True,
                "verify_exp": True,
            },
        )

        if "exp" not in payload:
            return None

        return payload

    except JWTError:
        return None
    except Exception:
        return None


RESET_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "15")
)


def get_password_hash(password: str) -> str:
    return hash_password(password)


def create_password_reset_token(email: str, role: str) -> str:
    """Generate a short-lived signed JWT specifically for password recovery."""
    expire = datetime.now(UTC) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": email,
        "role": role,
        "type": "password_reset",
        "exp": expire,
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_password_reset_token(token: str) -> dict | None:
    """Validate and decode password reset token with strict HS256 and expiration check."""
    if not token or not isinstance(token, str):
        return None

    try:
        header = jwt.get_unverified_header(token)
        alg = str(header.get("alg") or "").strip()
        if not alg or alg.lower() == "none" or alg not in ALLOWED_ALGORITHMS:
            return None

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=ALLOWED_ALGORITHMS,
            options={
                "verify_signature": True,
                "verify_exp": True,
            },
        )
        if payload.get("type") != "password_reset" or "exp" not in payload:
            return None
        return payload
    except JWTError:
        return None
    except Exception:
        return None

