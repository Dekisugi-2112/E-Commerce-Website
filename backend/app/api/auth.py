import uuid
import hashlib
import jwt
import time
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.core.config import settings
from app.core.supabase import get_supabase_client
import random
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserProfileResponse, ForgotPasswordRequest, ResetPasswordRequest

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

reset_codes = {} # key: email (lowercase), value: {"code": code, "expires_at": timestamp}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """
    Gửi mã xác thực khôi phục mật khẩu qua Email (Mô phỏng bằng cách in ra console và trả về trong response)
    """
    supabase = get_supabase_client()
    email_clean = req.email.strip().lower()

    # 1. Kiểm tra xem Email có tồn tại trong bảng profiles không
    try:
        existing = supabase.table("profiles").select("*").eq("email", email_clean).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(status_code=404, detail="Email này chưa được đăng ký trong hệ thống!")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kiểm tra cơ sở dữ liệu: {str(e)}")

    # 2. Tạo mã xác thực ngẫu nhiên 6 chữ số
    code = f"{random.randint(100000, 999999)}"
    reset_codes[email_clean] = {
        "code": code,
        "expires_at": time.time() + 600 # Hết hạn sau 10 phút
    }

    # 3. Mô phỏng gửi email bằng cách in ra console
    print("\n" + "="*50)
    print(f"   [SHOFY AUTH] MÃ KHÔI PHỤC MẬT KHẨU")
    print(f"   Email: {email_clean}")
    print(f"   Mã xác thực: {code}")
    print("="*50 + "\n")

    return {
        "success": True,
        "message": "Mã xác thực đã được gửi! Vui lòng kiểm tra email của bạn.",
        "dev_code": code # Trả về code để tiện phát triển/test offline
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    """
    Xác nhận mã và cập nhật mật khẩu mới cho tài khoản
    """
    supabase = get_supabase_client()
    email_clean = req.email.strip().lower()
    
    # 1. Kiểm tra xem mã xác thực có hợp lệ không
    if email_clean not in reset_codes:
        raise HTTPException(status_code=400, detail="Yêu cầu khôi phục mật khẩu không tồn tại hoặc đã hết hạn!")

    record = reset_codes[email_clean]
    if time.time() > record["expires_at"]:
        del reset_codes[email_clean]
        raise HTTPException(status_code=400, detail="Mã xác thực đã hết hạn!")

    if record["code"] != req.code.strip():
        raise HTTPException(status_code=400, detail="Mã xác thực không chính xác!")

    # 2. Cập nhật mật khẩu mới
    hashed_pwd = hash_password(req.new_password)
    try:
        # Cập nhật trong bảng profiles
        update_res = supabase.table("profiles").update({"password_hash": hashed_pwd}).eq("email", email_clean).execute()
        if not update_res.data:
            raise HTTPException(status_code=400, detail="Không thể cập nhật mật khẩu mới.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật mật khẩu mới trên Supabase: {str(e)}")

    # 3. Xoá mã xác thực đã dùng
    del reset_codes[email_clean]

    return {
        "success": True,
        "message": "Khôi phục mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."
    }
