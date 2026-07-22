import uuid
import hashlib
import jwt
import time
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserProfileResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = settings.SECRET_KEY if len(settings.SECRET_KEY) >= 32 else "shofy-fashion-ecommerce-demo-secret-key-32bytes!"

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": int(time.time()) + (86400 * 30) # 30 days valid for demo
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return {}

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.post("/register", response_model=AuthResponse)
def register_user(req: RegisterRequest):
    """
    Đăng ký tài khoản mới: Lưu trực tiếp thông tin vào bảng public.profiles trên Supabase PostgreSQL
    """
    supabase = get_supabase_client()
    email_clean = req.email.strip().lower()
    hashed_pwd = hash_password(req.password)

    # 1. Kiểm tra xem Email đã tồn tại trong bảng profiles trên Supabase chưa
    try:
        existing = supabase.table("profiles").select("*").eq("email", email_clean).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Email này đã được đăng ký. Vui lòng chọn Đăng nhập!")
    except HTTPException:
        raise
    except Exception as check_err:
        pass

    # 2. Tạo ID mới và chèn trực tiếp dữ liệu vào bảng public.profiles trên Supabase
    new_user_id = str(uuid.uuid4())
    profile_data = {
        "id": new_user_id,
        "email": email_clean,
        "password_hash": hashed_pwd,
        "full_name": req.full_name,
        "phone": req.phone or "",
        "role": "customer"
    }

    try:
        insert_res = supabase.table("profiles").insert(profile_data).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Không thể tạo tài khoản trên Supabase Database.")
    except Exception as err:
        err_msg = str(err)
        if "schema cache" in err_msg.lower() or "column" in err_msg.lower():
            raise HTTPException(
                status_code=500,
                detail="Bảng profiles trên Supabase chưa có cột 'email' và 'password_hash'. Vui lòng chạy file fix_profiles_table.sql trong Supabase SQL Editor!"
            )
        if "duplicate" in err_msg.lower() or "unique" in err_msg.lower():
            raise HTTPException(status_code=400, detail="Email này đã tồn tại trong hệ thống. Vui lòng đăng nhập!")
        raise HTTPException(status_code=400, detail=f"Lỗi tạo tài khoản trên Supabase: {err_msg}")

    # 3. Tạo JWT Token trả về cho Client
    access_token = create_jwt_token(new_user_id, email_clean, "customer")

    return AuthResponse(
        success=True,
        message="Đăng ký tài khoản thành công!",
        access_token=access_token,
        user=UserProfileResponse(
            id=new_user_id,
            email=email_clean,
            full_name=req.full_name,
            phone=req.phone or "",
            avatar_url="",
            role="customer"
        )
    )

@router.post("/login", response_model=AuthResponse)
def login_user(req: LoginRequest):
    """
    Đăng nhập hệ thống: Truy vấn trực tiếp từ bảng public.profiles trên Supabase PostgreSQL
    """
    supabase = get_supabase_client()
    email_clean = req.email.strip().lower()
    hashed_pwd = hash_password(req.password)

    # 1. Tìm user trong bảng public.profiles theo email và password_hash
    try:
        res = supabase.table("profiles").select("*").eq("email", email_clean).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác!")

        user_row = res.data[0]
        if user_row.get("password_hash") != hashed_pwd:
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác!")

        user_id = user_row.get("id")
        role = user_row.get("role", "customer")
        access_token = create_jwt_token(user_id, email_clean, role)

        return AuthResponse(
            success=True,
            message="Đăng nhập thành công!",
            access_token=access_token,
            user=UserProfileResponse(
                id=user_id,
                email=email_clean,
                full_name=user_row.get("full_name", email_clean.split("@")[0]),
                phone=user_row.get("phone", ""),
                avatar_url=user_row.get("avatar_url", ""),
                role=role
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        if "schema cache" in err_msg.lower() or "column" in err_msg.lower():
            raise HTTPException(
                status_code=500,
                detail="Bảng profiles trên Supabase chưa có cột 'email' và 'password_hash'. Vui lòng chạy file fix_profiles_table.sql trong Supabase SQL Editor!"
            )
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác!")

@router.get("/me", response_model=UserProfileResponse)
def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Lấy thông tin profile người dùng từ Supabase PostgreSQL
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc thiếu Authorization header")

    token = authorization.split(" ")[1]
    decoded = decode_jwt_token(token)

    if not decoded or "sub" not in decoded:
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc không hợp lệ")

    user_id = decoded["sub"]
    email_clean = decoded.get("email", "")

    supabase = get_supabase_client()
    try:
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if profile_res.data and len(profile_res.data) > 0:
            p = profile_res.data[0]
            return UserProfileResponse(
                id=user_id,
                email=p.get("email", email_clean),
                full_name=p.get("full_name", email_clean.split("@")[0]),
                phone=p.get("phone", ""),
                avatar_url=p.get("avatar_url", ""),
                role=p.get("role", "customer")
            )
    except Exception:
        pass

    return UserProfileResponse(
        id=user_id,
        email=email_clean,
        full_name=email_clean.split("@")[0],
        phone="",
        avatar_url="",
        role="customer"
    )

from app.schemas.auth import ProfileUpdateRequest

@router.put("/profile", response_model=UserProfileResponse)
def update_profile(req: ProfileUpdateRequest, authorization: Optional[str] = Header(None)):
    """
    Cập nhật thông tin tài khoản người dùng
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để cập nhật hồ sơ")
    token = authorization.split(" ")[1]
    decoded = decode_jwt_token(token)
    if not decoded or "sub" not in decoded:
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc không hợp lệ")

    user_id = decoded["sub"]
    supabase = get_supabase_client()
    
    update_data = {
        "full_name": req.full_name,
        "phone": req.phone or "",
    }
    if req.avatar_url is not None:
        update_data["avatar_url"] = req.avatar_url

    try:
        res = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Không thể cập nhật hồ sơ")
        
        p = res.data[0]
        return UserProfileResponse(
            id=user_id,
            email=p.get("email") or decoded.get("email", ""),
            full_name=p.get("full_name"),
            phone=p.get("phone"),
            avatar_url=p.get("avatar_url", ""),
            role=p.get("role", "customer")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật hồ sơ: {str(e)}")
