from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    role: str = "customer"  # "customer", "restaurant_owner", "delivery_partner"


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    role: str = "customer"