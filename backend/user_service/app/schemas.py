
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RoleUpdate(BaseModel):
    role: Literal["student", "admin"]
class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)