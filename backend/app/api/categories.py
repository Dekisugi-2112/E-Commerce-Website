from fastapi import APIRouter
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("")
def get_categories():
    """
    Lấy danh sách tất cả các danh mục thời trang
    """
    supabase = get_supabase_client()
    response = supabase.table("categories").select("*").execute()
    return {
        "success": True,
        "data": response.data
    }
