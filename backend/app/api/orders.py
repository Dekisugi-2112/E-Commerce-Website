from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
import jwt
import time
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.schemas.order import CheckoutRequest, OrderResponse

router = APIRouter(prefix="/orders", tags=["Orders"])

SECRET_KEY = settings.SECRET_KEY if len(settings.SECRET_KEY) >= 32 else "shofy-fashion-ecommerce-demo-secret-key-32bytes!"

def get_user_id_from_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để tiến hành đặt hàng")
    token = authorization.split(" ")[1]
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn. Vui lòng đăng nhập lại.")

@router.post("/checkout", response_model=OrderResponse)
def checkout_order(req: CheckoutRequest, authorization: Optional[str] = Header(None)):
    """
    Tạo đơn hàng mới (Trừ tồn kho, lưu đơn hàng, tạo giao dịch thanh toán)
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()

    # 1. Tính toán tổng thanh toán
    subtotal = sum(item.price * item.quantity for item in req.items)
    final_total = max(0, subtotal + req.shipping_fee - req.discount_amount)

    try:
        # 2. Lưu địa chỉ nhận hàng vào public.addresses và lấy id
        addr_data = {
            "user_id": user_id,
            "recipient_name": req.address.recipient_name,
            "phone": req.address.phone,
            "province": req.address.province,
            "district": req.address.district,
            "ward": req.address.ward,
            "detail": req.address.detail,
            "is_default": False
        }
        addr_res = supabase.table("addresses").insert(addr_data).execute()
        address_id = addr_res.data[0]["id"] if addr_res.data else None

        # 3. Tạo bản ghi Đơn hàng (orders)
        order_data = {
            "user_id": user_id,
            "address_id": address_id,
            "status": "pending",
            "subtotal": subtotal,
            "discount_amount": req.discount_amount,
            "shipping_fee": req.shipping_fee,
            "total": final_total,
            "coupon_code": req.coupon_code,
            "note": req.note
        }
        order_res = supabase.table("orders").insert(order_data).execute()
        if not order_res.data:
            raise HTTPException(status_code=500, detail="Không thể tạo đơn hàng trên cơ sở dữ liệu.")
        
        order_id = order_res.data[0]["id"]

        # 4. Lưu danh sách sản phẩm đặt hàng (order_items) & trừ kho
        for item in req.items:
            # Lưu item
            item_data = {
                "order_id": order_id,
                "variant_id": item.variant_id,
                "product_name": item.product_name,
                "variant_attributes": item.variant_attributes,
                "price": item.price,
                "quantity": item.quantity
            }
            supabase.table("order_items").insert(item_data).execute()

            # Trừ kho stock_quantity
            try:
                variant_res = supabase.table("product_variants").select("stock_quantity").eq("id", item.variant_id).execute()
                if variant_res.data:
                    curr_stock = variant_res.data[0]["stock_quantity"]
                    new_stock = max(0, curr_stock - item.quantity)
                    supabase.table("product_variants").update({"stock_quantity": new_stock}).eq("id", item.variant_id).execute()
            except Exception:
                pass

        # 5. Lưu thông tin thanh toán (payments)
        payment_data = {
            "order_id": order_id,
            "method": req.payment_method,
            "status": "pending",
            "amount": final_total
        }
        supabase.table("payments").insert(payment_data).execute()

        # 6. Xử lý chuyển hướng nếu chọn VNPay
        redirect_url = None
        if req.payment_method.lower() == "vnpay":
            # Tạo URL chuyển hướng Sandbox giả lập
            redirect_url = f"/checkout/vnpay-mock?order_id={order_id}&amount={final_total}"

        return OrderResponse(
            success=True,
            message="Đặt hàng thành công!",
            order_id=order_id,
            redirect_url=redirect_url
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi thanh toán & tạo đơn hàng: {str(e)}")

@router.get("")
def get_user_orders(authorization: Optional[str] = Header(None)):
    """
    Lấy lịch sử đơn hàng của người dùng đang đăng nhập
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()
    try:
        res = supabase.table("orders").select(
            "*, order_items(*), payments(*), addresses(*)"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()
        return {
            "success": True,
            "data": res.data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{order_id}/cancel")
def cancel_order(order_id: str, authorization: Optional[str] = Header(None)):
    """
    Hủy đơn hàng nếu đơn hàng ở trạng thái Chờ xác nhận (pending) và hoàn lại kho
    """
    user_id = get_user_id_from_token(authorization)
    supabase = get_supabase_client()

    try:
        # Kiểm tra trạng thái đơn
        res = supabase.table("orders").select("*, order_items(*)").eq("id", order_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        order = res.data[0]
        if order["status"] != "pending":
            raise HTTPException(status_code=400, detail="Chỉ có thể hủy đơn hàng ở trạng thái Chờ xác nhận")

        # Cập nhật trạng thái đơn hàng thành cancelled
        supabase.table("orders").update({"status": "cancelled"}).eq("id", order_id).execute()
        # Cập nhật trạng thái thanh toán thành failed/cancelled
        supabase.table("payments").update({"status": "failed"}).eq("order_id", order_id).execute()

        # Hoàn kho
        for item in order.get("order_items", []):
            if item.get("variant_id"):
                try:
                    v_res = supabase.table("product_variants").select("stock_quantity").eq("id", item["variant_id"]).execute()
                    if v_res.data:
                        curr_stock = v_res.data[0]["stock_quantity"]
                        new_stock = curr_stock + item["quantity"]
                        supabase.table("product_variants").update({"stock_quantity": new_stock}).eq("id", item["variant_id"]).execute()
                except Exception:
                    pass

        return {"success": True, "message": "Hủy đơn hàng thành công và đã hoàn trả kho!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{order_id}/pay-success")
def set_payment_success(order_id: str):
    """
    Xác nhận thanh toán online thành công (Mô phỏng VNPay Sandbox)
    """
    supabase = get_supabase_client()
    try:
        # Cập nhật đơn hàng thành confirmed
        supabase.table("orders").update({"status": "confirmed"}).eq("id", order_id).execute()
        # Cập nhật payment thành paid
        import datetime
        supabase.table("payments").update({
            "status": "paid", 
            "paid_at": datetime.datetime.now().isoformat()
        }).eq("order_id", order_id).execute()
        return {"success": True, "message": "Thanh toán đơn hàng thành công!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi xác thực thanh toán: {str(e)}")
