from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import jwt
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.schemas.review import ReviewCreateRequest

router = APIRouter(prefix="/reviews", tags=["Reviews"])

SECRET_KEY = settings.SECRET_KEY if len(settings.SECRET_KEY) >= 32 else "shofy-fashion-ecommerce-demo-secret-key-32bytes!"

def get_user_id_from_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để gửi đánh giá")
    token = authorization.split(" ")[1]
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn. Vui lòng đăng nhập lại.")

@router.get("/product/{product_id}")
def get_product_reviews(product_id: str):
    """
    Lấy toàn bộ danh sách đánh giá của 1 sản phẩm thời trang (Kèm tên người đánh giá)
    """
    supabase = get_supabase_client()
    try:
        res = supabase.table("reviews").select(
            "*, profiles(full_name, email)"
        ).eq("product_id", product_id).order("created_at", desc=True).execute()
        return {
            "success": True,
            "data": res.data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi truy vấn đánh giá: {str(e)}")

@router.post("")
def create_product_review(req: ReviewCreateRequest, authorization: Optional[str] = Header(None)):
    """
    Gửi đánh giá mới cho sản phẩm & Tự động tính toán cập nhật lại điểm trung bình avg_rating của sản phẩm
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()

    review_data = {
        "product_id": req.product_id,
        "user_id": user_id,
        "rating": req.rating,
        "comment": req.comment or ""
    }

    try:
        # 1. Thêm đánh giá mới
        insert_res = supabase.table("reviews").insert(review_data).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Không thể lưu đánh giá của bạn.")

        # 2. Lấy toàn bộ đánh giá của sản phẩm này để tính trung bình cộng điểm rating mới
        all_reviews = supabase.table("reviews").select("rating").eq("product_id", req.product_id).execute()
        if all_reviews.data:
            ratings = [r["rating"] for r in all_reviews.data]
            avg_rating = round(sum(ratings) / len(ratings), 1)
            
            # Cập nhật điểm đánh giá trung bình avg_rating trong bảng products
            supabase.table("products").update({"avg_rating": avg_rating}).eq("id", req.product_id).execute()

        return {
            "success": True,
            "message": "Cảm ơn bạn đã gửi đánh giá sản phẩm!",
            "data": insert_res.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lưu đánh giá: {str(e)}")
