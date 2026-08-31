"""Schemas Pydantic de autenticación y usuarios."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.validators import Email, Password
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: Email
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: Email
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    email: Email
    full_name: str = Field(min_length=2, max_length=255)
    password: Password
    role: UserRole
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: Password
