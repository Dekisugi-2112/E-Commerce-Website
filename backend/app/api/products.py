from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("")
def get_products(
    category_slug: Optional[str] = Query(None, description="Lọc theo slug danh mục"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm"),
    min_price: Optional[float] = Query(None, description="Giá tối thiểu"),
    max_price: Optional[float] = Query(None, description="Giá tối đa"),
    sort: Optional[str] = Query("newest", description="Sắp xếp: newest, price_asc, price_desc, popular"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Lấy danh sách sản phẩm thời trang từ PostgreSQL Supabase (Hỗ trợ tìm kiếm, lọc và sắp xếp)
    """
    supabase = get_supabase_client()
    
    # 1. Giải quyết các category_id từ category_slug (bao gồm cả danh mục con nếu là danh mục cha)
    category_ids = []
    if category_slug:
        try:
            cat_res = supabase.table("categories").select("id").eq("slug", category_slug).execute()
            if cat_res.data and len(cat_res.data) > 0:
                parent_id = cat_res.data[0]["id"]
                category_ids.append(parent_id)
                
                # Lấy danh sách danh mục con trực thuộc
                child_res = supabase.table("categories").select("id").eq("parent_id", parent_id).execute()
                if child_res.data:
                    for child in child_res.data:
                        category_ids.append(child["id"])
        except Exception:
            pass

    # 2. Xây dựng truy vấn sản phẩm
    query = supabase.table("products").select(
        "*, categories(name, slug), product_images(image_url, is_primary), product_variants(id, sku, attributes, price, stock_quantity)"
    ).eq("status", "active")

    if category_ids:
        query = query.in_("category_id", category_ids)

    if search:
        # Tìm kiếm không phân biệt hoa thường
        query = query.ilike("name", f"%{search}%")

    if min_price is not None:
        query = query.gte("base_price", min_price)

    if max_price is not None:
        query = query.lte("base_price", max_price)

    # 3. Áp dụng sắp xếp
    if sort == "price_asc":
        query = query.order("base_price", desc=False)
    elif sort == "price_desc":
        query = query.order("base_price", desc=True)
    elif sort == "popular":
        query = query.order("total_sold", desc=True)
    else:  # default: newest
        query = query.order("created_at", desc=True)

    response = query.range(offset, offset + limit - 1).execute()
    
    return {
        "success": True,
        "data": response.data,
        "count": len(response.data)
    }

@router.get("/{slug}")
def get_product_by_slug(slug: str):
    """
    Lấy chi tiết 1 sản phẩm thời trang theo slug (kèm đầy đủ ảnh và tất cả biến thể size/màu)
    """
    supabase = get_supabase_client()
    response = supabase.table("products").select(
        "*, categories(name, slug), product_images(image_url, is_primary, display_order), product_variants(id, sku, attributes, price, stock_quantity)"
    ).eq("slug", slug).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    return {
        "success": True,
        "data": response.data[0]
    }
