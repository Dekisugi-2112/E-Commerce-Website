from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
import jwt
from pydantic import BaseModel
from app.core.config import settings
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/addresses", tags=["Addresses"])

SECRET_KEY = settings.SECRET_KEY if len(settings.SECRET_KEY) >= 32 else "shofy-fashion-ecommerce-demo-secret-key-32bytes!"

class AddressCreateRequest(BaseModel):
    recipient_name: str
    phone: str
    province: str
    district: str
    ward: str
    detail: str
    is_default: bool = False

def get_user_id_from_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để thực hiện thao tác")
    token = authorization.split(" ")[1]
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn. Vui lòng đăng nhập lại.")

@router.get("")
def get_user_addresses(authorization: Optional[str] = Header(None)):
    """
    Lấy danh sách địa chỉ nhận hàng của người dùng đang đăng nhập
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("addresses").select("*").eq("user_id", user_id).order("is_default", desc=True).execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("")
def add_address(req: AddressCreateRequest, authorization: Optional[str] = Header(None)):
    """
    Thêm địa chỉ nhận hàng mới
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()

    try:
        # Nếu được đặt làm mặc định, bỏ mặc định các địa chỉ cũ
        if req.is_default:
            supabase.table("addresses").update({"is_default": False}).eq("user_id", user_id).execute()

        address_data = {
            "user_id": user_id,
            "recipient_name": req.recipient_name,
            "phone": req.phone,
            "province": req.province,
            "district": req.district,
            "ward": req.ward,
            "detail": req.detail,
            "is_default": req.is_default
        }
        res = supabase.table("addresses").insert(address_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Không thể tạo địa chỉ mới")
        
        return {"success": True, "message": "Thêm địa chỉ nhận hàng thành công!", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{address_id}/default")
def set_default_address(address_id: str, authorization: Optional[str] = Header(None)):
    """
    Đặt địa chỉ này làm mặc định và bỏ mặc định toàn bộ địa chỉ khác
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()

    try:
        # 1. Bỏ mặc định của tất cả địa chỉ của user này
        supabase.table("addresses").update({"is_default": False}).eq("user_id", user_id).execute()
        # 2. Đặt địa chỉ được chọn làm mặc định
        res = supabase.table("addresses").update({"is_default": True}).eq("id", address_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
        
        return {"success": True, "message": "Đặt địa chỉ mặc định thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{address_id}")
def delete_address(address_id: str, authorization: Optional[str] = Header(None)):
    """
    Xóa địa chỉ nhận hàng
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()

    try:
        res = supabase.table("addresses").delete().eq("id", address_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
        
        return {"success": True, "message": "Xóa địa chỉ thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
