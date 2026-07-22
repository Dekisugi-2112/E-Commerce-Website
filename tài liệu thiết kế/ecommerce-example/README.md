# Khung code mẫu - Module Products (FastAPI + Supabase)

Đây là ví dụ THẬT cho 1 module (`products`) theo kiến trúc Layered + Modular Monolith
đã đề cập ở phần trước. Copy cấu trúc này để làm tiếp các module `cart`, `orders`, `auth`...

## Luồng chạy của 1 request

Khi client gọi `GET /api/v1/products/ao-thun-nam`:

```
1. router.py       nhận request, lấy `slug` từ URL
        ↓
2. service.py       gọi repo.get_by_slug(), nếu không có sản phẩm -> raise HTTPException 404
        ↓
3. repository.py    chạy SELECT ... WHERE slug = 'ao-thun-nam' trên Postgres
        ↓
4. models.py        SQLAlchemy trả về object Product (kèm variants, images)
        ↓
5. schemas.py        FastAPI tự động convert object Product -> JSON theo ProductOut
        ↓
   Response JSON trả về client
```

**Quy tắc vàng:** `router` chỉ được gọi `service`, `service` chỉ được gọi `repository`.
Không được nhảy cóc (vd: router gọi thẳng repository) - phá vỡ quy tắc này sẽ làm code
khó test và khó maintain khi dự án lớn lên.

## Cách chạy thử

1. Tạo file `.env` ở thư mục gốc:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:[password]@[host]:5432/postgres
   ```
   Lấy connection string trong Supabase Dashboard > Project Settings > Database.
   **Lưu ý:** phải dùng driver `asyncpg` (không phải `psycopg2`) vì code dùng async.

2. Cài thư viện:
   ```bash
   pip install -r requirements.txt
   ```

3. Chạy server:
   ```bash
   uvicorn app.main:app --reload
   ```

4. Mở trình duyệt: `http://localhost:8000/docs` - FastAPI tự sinh giao diện Swagger
   để bạn test API ngay, không cần Postman.

## Áp dụng cho module tiếp theo (vd: `orders`)

Tạo thư mục `app/orders/` với đúng 5 file như `products/`:
- `models.py` — bảng `orders`, `order_items`
- `schemas.py` — `OrderCreate`, `OrderOut`...
- `repository.py` — `create_order()`, `get_by_id()`...
- `service.py` — logic checkout: kiểm tra tồn kho (gọi sang `ProductService`),
  tính tổng tiền, áp coupon, trừ stock...
- `router.py` — endpoint `POST /api/v1/orders/checkout`

Rồi thêm 1 dòng `app.include_router(orders_router)` vào `main.py`.

## Ghi chú về Supabase

- Bảng ở đây tạo qua SQLAlchemy (`Base.metadata.create_all`) hoặc qua SQL migration
  chạy trực tiếp trong Supabase SQL Editor - bạn chọn 1 trong 2, không nên dùng cả hai
  cùng lúc để tránh xung đột.
- Với việc upload ảnh sản phẩm lên Supabase Storage, nên tạo thêm 1 file
  `app/core/storage.py` dùng `supabase-py` client riêng cho việc upload/xóa file,
  tách biệt khỏi phần truy vấn Postgres qua SQLAlchemy.
