from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: str = Field(..., min_length=2, description="Họ và tên")
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = ""
    phone: Optional[str] = ""
    avatar_url: Optional[str] = ""
    role: str = "customer"

class AuthResponse(BaseModel):
    success: bool = True
    message: str
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserProfileResponse] = None

class ProfileUpdateRequest(BaseModel):
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới tối thiểu 6 ký tự")
