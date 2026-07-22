from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
import jwt
import datetime
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.schemas.admin import (
    CategoryAdminSchema, ProductAdminSchema, VariantAdminSchema, 
    OrderStatusUpdateSchema, CouponAdminSchema
)

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])

SECRET_KEY = settings.SECRET_KEY if len(settings.SECRET_KEY) >= 32 else "shofy-fashion-ecommerce-demo-secret-key-32bytes!"

def verify_admin_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập tài khoản Admin")
    token = authorization.split(" ")[1]
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        # Để đồ án dễ demo, nếu token giải mã hợp lệ, ta cho phép kiểm tra quyền
        if decoded.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Tài khoản của bạn không có quyền Admin")
        return decoded["sub"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn. Vui lòng đăng nhập lại.")

# ---------------------------------------------------------------------
# 1. ADMIN DASHBOARD STATS
# ---------------------------------------------------------------------
@router.get("/stats")
def get_dashboard_stats(authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()

    try:
        # Doanh thu (tổng thanh toán status 'paid')
        pmt_res = supabase.table("payments").select("amount").eq("status", "paid").execute()
        revenue = sum(p["amount"] for p in pmt_res.data) if pmt_res.data else 0

        # Số lượng đơn hàng
        orders_res = supabase.table("orders").select("id", count="exact").execute()
        total_orders = len(orders_res.data) if orders_res.data else 0

        # Số lượng sản phẩm
        products_res = supabase.table("products").select("id", count="exact").execute()
        total_products = len(products_res.data) if products_res.data else 0

        # Số lượng người dùng (profiles)
        profiles_res = supabase.table("profiles").select("id", count="exact").execute()
        total_users = len(profiles_res.data) if profiles_res.data else 0

        # Đơn hàng gần đây
        recent_orders = supabase.table("orders").select(
            "*, profiles(full_name, email), payments(*)"
        ).order("created_at", desc=True).limit(5).execute()

        # Lấy danh mục để nhóm theo parent/child
        cats_res = supabase.table("categories").select("id, name, parent_id").execute()
        cats_map = {c["id"]: c for c in cats_res.data} if cats_res.data else {}

        # Thống kê số lượng bán của từng danh mục cha
        category_stats = {}
        valid_orders_res = supabase.table("orders").select("id").neq("status", "cancelled").execute()
        valid_order_ids = [o["id"] for o in valid_orders_res.data] if valid_orders_res.data else []

        if valid_order_ids:
            items_res = supabase.table("order_items").select("quantity, variant_id").in_("order_id", valid_order_ids).execute()
            variants_res = supabase.table("product_variants").select("id, product_id, products(category_id)").execute()
            var_map = {v["id"]: v["products"]["category_id"] for v in variants_res.data if v.get("products") and v["products"]} if variants_res.data else {}

            for item in items_res.data:
                v_id = item["variant_id"]
                qty = item["quantity"]
                if v_id in var_map:
                    cat_id = var_map[v_id]
                    cat_info = cats_map.get(cat_id)
                    if cat_info:
                        parent_id = cat_info.get("parent_id")
                        group_name = cat_info["name"]
                        if parent_id and parent_id in cats_map:
                            group_name = cats_map[parent_id]["name"]
                        category_stats[group_name] = category_stats.get(group_name, 0) + qty

        cat_stats_list = [{"category": name, "sales": qty} for name, qty in category_stats.items()]
        cat_stats_list.sort(key=lambda x: x["sales"], reverse=True)

        return {
            "success": True,
            "stats": {
                "revenue": revenue,
                "total_orders": total_orders,
                "total_products": total_products,
                "total_users": total_users
            },
            "recent_orders": recent_orders.data,
            "category_stats": cat_stats_list
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------------------
# 2. CATEGORY CRUD
# ---------------------------------------------------------------------
@router.post("/categories")
def admin_create_category(req: CategoryAdminSchema, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("categories").insert({
            "name": req.name,
            "slug": req.slug,
            "image_url": req.image_url or ""
        }).execute()
        return {"success": True, "message": "Thêm danh mục mới thành công!", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/categories/{cat_id}")
def admin_update_category(cat_id: str, req: CategoryAdminSchema, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("categories").update({
            "name": req.name,
            "slug": req.slug,
            "image_url": req.image_url or ""
        }).eq("id", cat_id).execute()
        return {"success": True, "message": "Cập nhật danh mục thành công!", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/categories/{cat_id}")
def admin_delete_category(cat_id: str, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        supabase.table("categories").delete().eq("id", cat_id).execute()
        return {"success": True, "message": "Xóa danh mục thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------------------
# 3. PRODUCT & VARIANT CRUD
# ---------------------------------------------------------------------
@router.post("/products")
def admin_create_product(req: ProductAdminSchema, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        # Thêm sản phẩm
        res = supabase.table("products").insert({
            "name": req.name,
            "slug": req.slug,
            "description": req.description,
            "base_price": req.base_price,
            "category_id": req.category_id,
            "status": req.status
        }).execute()
        
        # Thêm ảnh nếu có
        if req.image_url:
            supabase.table("product_images").insert({
                "product_id": res.data[0]["id"],
                "image_url": req.image_url,
                "is_primary": True,
                "display_order": 1
            }).execute()
            
        return {"success": True, "message": "Thêm sản phẩm mới thành công!", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/products/{product_id}")
def admin_update_product(product_id: str, req: ProductAdminSchema, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("products").update({
            "name": req.name,
            "slug": req.slug,
            "description": req.description,
            "base_price": req.base_price,
            "category_id": req.category_id,
            "status": req.status
        }).eq("id", product_id).execute()
        
        # Cập nhật ảnh nếu có
        if req.image_url:
            img_res = supabase.table("product_images").select("*").eq("product_id", product_id).eq("is_primary", True).execute()
            if img_res.data:
                supabase.table("product_images").update({
                    "image_url": req.image_url
                }).eq("id", img_res.data[0]["id"]).execute()
            else:
                supabase.table("product_images").insert({
                    "product_id": product_id,
                    "image_url": req.image_url,
                    "is_primary": True,
                    "display_order": 1
                }).execute()
                
        return {"success": True, "message": "Cập nhật sản phẩm thành công!", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/products/{product_id}")
def admin_delete_product(product_id: str, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        supabase.table("products").delete().eq("id", product_id).execute()
        return {"success": True, "message": "Xóa sản phẩm thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Variants Operations
@router.post("/products/{product_id}/variants")
def admin_add_variant(product_id: str, req: VariantAdminSchema, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("product_variants").insert({
            "product_id": product_id,
            "sku": req.sku,
            "attributes": req.attributes,
            "price": req.price,
            "stock_quantity": req.stock_quantity
        }).execute()
        return {"success": True, "message": "Thêm biến thể sản phẩm thành công!", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/variants/{variant_id}")
def admin_delete_variant(variant_id: str, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        supabase.table("product_variants").delete().eq("id", variant_id).execute()
        return {"success": True, "message": "Xóa biến thể sản phẩm thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------------------
# 4. ORDER MANAGEMENT
# ---------------------------------------------------------------------
@router.get("/orders")
def admin_get_all_orders(authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("orders").select(
            "*, profiles(full_name, email, phone), order_items(*), payments(*), addresses(*)"
        ).order("created_at", desc=True).execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/orders/{order_id}/status")
def admin_update_order_status(order_id: str, req: OrderStatusUpdateSchema, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        # Cập nhật trạng thái đơn hàng
        res = supabase.table("orders").update({"status": req.status}).eq("id", order_id).execute()
        
        # Nếu giao hàng thành công (delivered), cập nhật luôn trạng thái thanh toán thành paid
        if req.status.lower() == "delivered":
            supabase.table("payments").update({
                "status": "paid",
                "paid_at": datetime.datetime.now().isoformat()
            }).eq("order_id", order_id).execute()
            
        elif req.status.lower() == "cancelled":
            # Hủy đơn hàng -> Cập nhật payment thành failed & Hoàn kho
            supabase.table("payments").update({"status": "failed"}).eq("order_id", order_id).execute()
            
            # Trích xuất order items để hoàn kho
            items_res = supabase.table("order_items").select("*").eq("order_id", order_id).execute()
            if items_res.data:
                for item in items_res.data:
                    if item.get("variant_id"):
                        try:
                            v_res = supabase.table("product_variants").select("stock_quantity").eq("id", item["variant_id"]).execute()
                            if v_res.data:
                                curr_stock = v_res.data[0]["stock_quantity"]
                                new_stock = curr_stock + item["quantity"]
                                supabase.table("product_variants").update({"stock_quantity": new_stock}).eq("id", item["variant_id"]).execute()
                        except Exception:
                            pass

        return {"success": True, "message": f"Cập nhật trạng thái đơn hàng thành: {req.status} thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------------------
# 5. COUPON CRUD
# ---------------------------------------------------------------------
@router.get("/coupons")
def admin_get_all_coupons(authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("coupons").select("*").order("code").execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/coupons")
def admin_create_coupon(req: CouponAdminSchema, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("coupons").insert({
            "code": req.code.upper(),
            "discount_type": req.discount_type,
            "discount_value": req.discount_value,
            "min_order_value": req.min_order_value,
            "max_discount_amount": req.max_discount_amount,
            "is_active": req.is_active
        }).execute()
        return {"success": True, "message": "Tạo mã giảm giá mới thành công!", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/coupons/{coupon_id}")
def admin_delete_coupon(coupon_id: str, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)
    supabase = get_supabase_client()
    try:
        supabase.table("coupons").delete().eq("id", coupon_id).execute()
        return {"success": True, "message": "Xóa mã giảm giá thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
