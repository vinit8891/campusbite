from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.roles import ALL_ROLES
from app.auth.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Not authenticated"):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _forbidden(detail: str = "Insufficient permissions"):
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ] = None,
) -> dict:
    """Validate Bearer JWT and return the token payload as the current user."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    payload = decode_access_token(credentials.credentials)

    if payload is None:
        raise _unauthorized("Invalid or expired token")

    role = payload.get("role")
    sub = payload.get("sub")

    if not sub:
        raise _unauthorized("Invalid token payload")

    if role not in ALL_ROLES:
        raise _unauthorized("Invalid token role")

    return payload


def require_roles(*allowed_roles: str):
    """Dependency factory that requires the JWT role to be one of allowed_roles."""

    if not allowed_roles:
        raise ValueError("At least one role is required")

    async def role_checker(
        current_user: Annotated[dict, Depends(get_current_user)],
    ) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise _forbidden(
                f"This action requires one of: {', '.join(allowed_roles)}"
            )
        return current_user

    return role_checker


def assert_same_identity(
    current_user: dict,
    *,
    email: str | None = None,
    phone: str | None = None,
):
    """Ensure path/body identity matches the authenticated user (admins bypass)."""
    if current_user.get("role") == "admin":
        return

    if email is not None:
        token_email = current_user.get("email") or (
            current_user.get("sub")
            if current_user.get("role") == "restaurant_owner"
            else None
        )
        if not token_email or token_email.lower() != email.lower():
            raise _forbidden("You can only access your own resources")

    if phone is not None:
        token_phone = current_user.get("phone")
        if not token_phone or str(token_phone) != str(phone):
            raise _forbidden("You can only access your own resources")
