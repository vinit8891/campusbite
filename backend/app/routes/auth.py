from fastapi import APIRouter, HTTPException

from app.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import (
    create_user,
    get_user_by_email,
)
from app.schemas.user import (
    Token,
    UserLogin,
    UserRegister,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/register")
async def register(user: UserRegister):

    existing = await get_user_by_email(user.email)

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    user_data = user.model_dump()

    user_data["password"] = hash_password(
        user.password
    )

    user_id = await create_user(user_data)

    return {
        "message": "User registered successfully",
        "id": user_id,
    }


@router.post(
    "/login",
    response_model=Token,
)
async def login(user: UserLogin):

    db_user = await get_user_by_email(user.email)

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not verify_password(
        user.password,
        db_user["password"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = create_access_token(
        {
            "sub": str(db_user["_id"]),
            "email": db_user["email"],
            "full_name": db_user["full_name"],
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }