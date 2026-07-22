import os
import sys
import uuid
import random
import hashlib
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Reconfigure stdout for UTF-8 encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

env_path = r"d:\AI_My_Project\website-shofy-clothing-ecommerce\backend\.env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Thiếu SUPABASE_URL hoặc SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY trong file .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_test_data():
    print("=== BẮT ĐẦU NẠP DỮ LIỆU ĐỂ TEST THỐNG KÊ (10 USER & NHIỀU ĐƠN HÀNG) ===")
    
    # 1. Truy vấn các variants sản phẩm hiện có
    print("\n-> Đang lấy danh sách các sản phẩm và biến thể từ database...")
    variants_res = supabase.table("product_variants").select("*, products(name)").execute()
    variants = variants_res.data
    
    if not variants:
        print("  ⚠ Không tìm thấy biến thể sản phẩm nào trong database! Vui lòng seed sản phẩm trước.")
        sys.exit(1)
        
    print(f"  ✓ Tìm thấy {len(variants)} biến thể sản phẩm.")

    # 2. Xóa các đơn hàng cũ, thanh toán cũ và user test cũ để không bị trùng lặp
    print("\n-> Đang dọn dẹp dữ liệu test cũ...")
    try:
        # Xóa các profiles test (có email userX@example.com)
        supabase.table("profiles").delete().ilike("email", "user%@example.com").execute()
        print("  ✓ Đã dọn dẹp các user test cũ và các đơn hàng liên kết (Cascade delete).")
    except Exception as e:
        print(f"  ⚠ Lỗi khi dọn dẹp dữ liệu cũ: {e}")

    # 3. Tạo 10 user test
    print("\n-> Đang tạo 10 tài khoản user test (user1 -> user10)...")
    users_to_insert = []
    pwd_hash = hash_password("123456")
    
    for i in range(1, 11):
        users_to_insert.append({
            "id": str(uuid.uuid4()),
            "email": f"user{i}@example.com",
            "password_hash": pwd_hash,
            "full_name": f"Khách hàng {i}",
            "phone": f"098765432{i-1:01d}",
            "role": "customer",
            "avatar_url": f"https://api.dicebear.com/7.x/adventurer/svg?seed=user{i}"
        })
        
    user_res = supabase.table("profiles").insert(users_to_insert).execute()
    created_users = user_res.data
    print(f"  ✓ Đã tạo thành công {len(created_users)} user mới (Mật khẩu mặc định: 123456).")

    # 4. Tạo địa chỉ nhận hàng cho các user này
    print("\n-> Đang tạo địa chỉ nhận hàng cho các user...")
    addresses_to_insert = []
    provinces = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"]
    districts = ["Quận 1", "Quận Cầu Giấy", "Quận Hải Châu", "Quận Ninh Kiều", "Quận Lê Chân"]
    
    for idx, u in enumerate(created_users):
        addresses_to_insert.append({
            "id": str(uuid.uuid4()),
            "user_id": u["id"],
            "recipient_name": u["full_name"],
            "phone": u["phone"],
            "province": provinces[idx % len(provinces)],
            "district": districts[idx % len(districts)],
            "ward": "Phường 1",
            "detail": "123 Đường Số 1, Tổ 5",
            "is_default": True
        })
        
    addr_res = supabase.table("addresses").insert(addresses_to_insert).execute()
    created_addresses = addr_res.data
    
    # Map user_id to address_id for easy lookup
    user_address_map = {addr["user_id"]: addr["id"] for addr in created_addresses}
    print("  ✓ Đã tạo địa chỉ giao hàng mặc định.")

    # 5. Sinh thật nhiều đơn hàng trong vòng 90 ngày qua
    print("\n-> Đang tạo ngẫu nhiên 80 đơn hàng phân bố trong 90 ngày qua...")
    orders_to_insert = []
    order_items_to_insert = []
    payments_to_insert = []
    
    statuses = ["delivered", "delivered", "delivered", "shipping", "confirmed", "pending", "cancelled"]
    pay_methods = ["cod", "vnpay", "momo", "stripe"]
    
    now = datetime.now()
    
    for order_idx in range(1, 81):
        order_uuid = str(uuid.uuid4())
        
        # Chọn ngẫu nhiên user và address tương ứng
        user = random.choice(created_users)
        addr_id = user_address_map[user["id"]]
        
        # Chọn ngẫu nhiên từ 1 đến 3 sản phẩm
        num_items = random.randint(1, 3)
        selected_variants = random.sample(variants, num_items)
        
        subtotal = 0
        order_items = []
        
        for v in selected_variants:
            qty = random.randint(1, 2)
            item_price = float(v["price"])
            subtotal += item_price * qty
            
            order_items.append({
                "id": str(uuid.uuid4()),
                "order_id": order_uuid,
                "variant_id": v["id"],
                "product_name": v["products"]["name"],
                "variant_attributes": v["attributes"],
                "price": item_price,
                "quantity": qty
            })
            
        shipping_fee = 30000.0
        discount = 0.0
        
        # Ngẫu nhiên giảm giá 10%
        if random.random() < 0.25:
            discount = round(subtotal * 0.1, -3) # Làm tròn nghìn đồng
            
        total = max(subtotal - discount + shipping_fee, 0.0)
        
        # Tạo ngày tạo ngẫu nhiên phân bổ trong 90 ngày qua
        days_ago = random.randint(0, 90)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        order_date = now - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
        order_date_str = order_date.isoformat()
        
        status = random.choice(statuses)
        
        orders_to_insert.append({
            "id": order_uuid,
            "user_id": user["id"],
            "address_id": addr_id,
            "status": status,
            "subtotal": subtotal,
            "discount_amount": discount,
            "shipping_fee": shipping_fee,
            "total": total,
            "created_at": order_date_str,
            "updated_at": order_date_str
        })
        
        # Lưu các order items tương ứng
        order_items_to_insert.extend(order_items)
        
        # Tạo payment tương ứng
        pay_method = random.choice(pay_methods)
        
        # Trạng thái thanh toán mặc định
        pay_status = "pending"
        paid_at = None
        
        if status == "delivered":
            pay_status = "paid"
            paid_at = order_date_str
        elif status == "cancelled":
            pay_status = "failed"
            
        payments_to_insert.append({
            "id": str(uuid.uuid4()),
            "order_id": order_uuid,
            "method": pay_method,
            "status": pay_status,
            "amount": total,
            "paid_at": paid_at
        })

    # Chèn các đơn hàng theo lô 20 bản ghi
    print("  -> Đang đẩy đơn hàng lên Supabase...")
    for k in range(0, len(orders_to_insert), 20):
        supabase.table("orders").insert(orders_to_insert[k:k+20]).execute()
    print("  ✓ Đã chèn các đơn hàng thành công!")

    # Chèn các order items theo lô 30 bản ghi
    print("  -> Đang đẩy chi tiết đơn hàng lên Supabase...")
    for k in range(0, len(order_items_to_insert), 30):
        supabase.table("order_items").insert(order_items_to_insert[k:k+30]).execute()
    print("  ✓ Đã chèn chi tiết đơn hàng thành công!")

    # Chèn các payments theo lô 20 bản ghi
    print("  -> Đang đẩy thông tin thanh toán lên Supabase...")
    for k in range(0, len(payments_to_insert), 20):
        supabase.table("payments").insert(payments_to_insert[k:k+20]).execute()
    print("  ✓ Đã chèn thông tin thanh toán thành công!")

    print("\n✅ HOÀN TẤT NẠP DỮ LIỆU ĐƠN HÀNG VÀ USER TEST THÀNH CÔNG!")
    print(f"Tổng số User test: {len(created_users)}")
    print(f"Tổng số Đơn hàng test: {len(orders_to_insert)}")
    print("Tài khoản mẫu: user1@example.com -> user10@example.com (Mật khẩu: 123456)")

if __name__ == "__main__":
    seed_test_data()
