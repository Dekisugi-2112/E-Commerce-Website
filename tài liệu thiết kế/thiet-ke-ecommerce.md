# Thiết kế Website Bán Hàng (E-commerce)
**Stack:** Next.js (Frontend) + FastAPI (Backend) + Supabase (Database + Storage + Auth)

---

## 1. DANH SÁCH CHỨC NĂNG

### A. Phía khách hàng (Customer)
| Nhóm | Chức năng |
|---|---|
| **Tài khoản** | Đăng ký, đăng nhập, đăng xuất, quên/đặt lại mật khẩu, xác thực email, đăng nhập bằng Google (tùy chọn), cập nhật thông tin cá nhân, quản lý sổ địa chỉ |
| **Sản phẩm** | Xem danh sách sản phẩm, xem chi tiết sản phẩm, xem theo danh mục, tìm kiếm, lọc (giá, danh mục, đánh giá...), sắp xếp (giá, mới nhất, bán chạy), xem biến thể (size/màu), xem sản phẩm liên quan |
| **Giỏ hàng** | Thêm/xóa/sửa số lượng sản phẩm trong giỏ, xem tổng tiền, áp dụng mã giảm giá |
| **Wishlist** | Thêm/xóa sản phẩm yêu thích |
| **Đặt hàng** | Checkout, chọn địa chỉ giao hàng, chọn phương thức thanh toán, chọn phương thức vận chuyển, xác nhận đơn hàng |
| **Thanh toán** | Thanh toán online (VNPay/Momo/Stripe), thanh toán khi nhận hàng (COD) |
| **Đơn hàng** | Xem lịch sử đơn hàng, xem chi tiết đơn hàng, theo dõi trạng thái đơn hàng, hủy đơn hàng, yêu cầu trả hàng/hoàn tiền |
| **Đánh giá** | Viết đánh giá + rating sản phẩm (chỉ khi đã mua), xem đánh giá của người khác |
| **Thông báo** | Nhận email xác nhận đơn hàng, thông báo trạng thái đơn hàng, thông báo khuyến mãi |
| **Mã giảm giá** | Nhập mã giảm giá khi checkout |

### B. Phía quản trị (Admin)
| Nhóm | Chức năng |
|---|---|
| **Dashboard** | Thống kê doanh thu, đơn hàng, sản phẩm bán chạy, biểu đồ theo thời gian |
| **Quản lý sản phẩm** | CRUD sản phẩm, danh mục, biến thể, hình ảnh, quản lý tồn kho |
| **Quản lý đơn hàng** | Xem danh sách đơn hàng, cập nhật trạng thái đơn hàng, xử lý hoàn tiền/trả hàng |
| **Quản lý người dùng** | Xem danh sách khách hàng, khóa/mở tài khoản, phân quyền admin |
| **Khuyến mãi** | Tạo/sửa/xóa mã giảm giá, chương trình flash sale |
| **Quản lý đánh giá** | Duyệt/ẩn đánh giá không phù hợp |
| **Báo cáo** | Xuất báo cáo doanh thu, tồn kho |

---

## 2. THIẾT KẾ DATABASE (PostgreSQL trên Supabase)

> Ghi chú: Supabase đã có sẵn bảng `auth.users` để quản lý authentication. Ta tạo bảng `profiles` liên kết 1-1 với `auth.users` để lưu thông tin bổ sung.

### 2.1. `profiles`
### Thông tin người dùng mở rộng, liên kết với `auth.users`.
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK, FK → auth.users.id) | |
| full_name | text | |
| phone | text | |
| avatar_url | text | Link Supabase Storage |
| role | text | `customer` \| `admin` (default: customer) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | |

### 2.2. `addresses`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles.id) | |
| recipient_name | text | |
| phone | text | |
| province | text | |
| district | text | |
| ward | text | |
| detail | text | Số nhà, tên đường |
| is_default | boolean | default false |
| created_at | timestamptz | |

### 2.3. `categories`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| slug | text | unique, dùng cho URL |
| parent_id | uuid (FK → categories.id, nullable) | hỗ trợ danh mục con |
| image_url | text | |
| created_at | timestamptz | |

### 2.4. `products`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| category_id | uuid (FK → categories.id) | |
| name | text | |
| slug | text | unique |
| description | text | |
| base_price | numeric | |
| status | text | `active` \| `draft` \| `archived` |
| avg_rating | numeric | cache, cập nhật khi có review mới |
| total_sold | integer | default 0 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 2.5. `product_variants`
Biến thể sản phẩm (size, màu...).
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK → products.id) | |
| sku | text | unique |
| attributes | jsonb | vd: `{"size": "M", "color": "Đỏ"}` |
| price | numeric | có thể khác base_price |
| stock_quantity | integer | |
| created_at | timestamptz | |

### 2.6. `product_images`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK → products.id) | |
| image_url | text | link Supabase Storage |
| is_primary | boolean | |
| display_order | integer | |

### 2.7. `carts` / `cart_items`
**carts**
| Cột | Kiểu |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → profiles.id, unique) |
| updated_at | timestamptz |

**cart_items**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| cart_id | uuid (FK → carts.id) | |
| variant_id | uuid (FK → product_variants.id) | |
| quantity | integer | |

### 2.8. `wishlists`
| Cột | Kiểu |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → profiles.id) |
| product_id | uuid (FK → products.id) |
| created_at | timestamptz |

### 2.9. `orders`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles.id) | |
| address_id | uuid (FK → addresses.id) | snapshot địa chỉ lúc đặt |
| status | text | `pending`, `confirmed`, `shipping`, `delivered`, `cancelled`, `returned` |
| subtotal | numeric | |
| discount_amount | numeric | |
| shipping_fee | numeric | |
| total | numeric | |
| coupon_code | text | nullable |
| note | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 2.10. `order_items`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| order_id | uuid (FK → orders.id) | |
| variant_id | uuid (FK → product_variants.id) | |
| product_name | text | snapshot tên sản phẩm |
| variant_attributes | jsonb | snapshot lúc mua |
| price | numeric | giá tại thời điểm mua |
| quantity | integer | |

### 2.11. `payments`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| order_id | uuid (FK → orders.id) | |
| method | text | `cod`, `vnpay`, `momo`, `stripe` |
| status | text | `pending`, `paid`, `failed`, `refunded` |
| transaction_id | text | mã giao dịch từ cổng thanh toán |
| amount | numeric | |
| paid_at | timestamptz | |

### 2.12. `reviews`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK → products.id) | |
| user_id | uuid (FK → profiles.id) | |
| order_item_id | uuid (FK → order_items.id) | đảm bảo chỉ review khi đã mua |
| rating | integer | 1-5 |
| comment | text | |
| created_at | timestamptz | |

### 2.13. `coupons`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| code | text | unique |
| discount_type | text | `percent` \| `fixed` |
| discount_value | numeric | |
| min_order_value | numeric | |
| max_uses | integer | |
| used_count | integer | default 0 |
| starts_at | timestamptz | |
| expires_at | timestamptz | |
| is_active | boolean | |

### 2.14. `notifications`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles.id) | |
| title | text | |
| content | text | |
| is_read | boolean | default false |
| created_at | timestamptz | |

**Storage buckets (Supabase Storage):** `product-images`, `avatars`

---

## 3. THIẾT KẾ API ENDPOINTS (FastAPI)

Quy ước: prefix `/api/v1`, auth qua Bearer JWT (Supabase Auth token), route admin có prefix `/admin` và middleware kiểm tra `role == admin`.

### 3.1. Auth
```
POST   /api/v1/auth/register          Đăng ký
POST   /api/v1/auth/login             Đăng nhập
POST   /api/v1/auth/logout            Đăng xuất
POST   /api/v1/auth/forgot-password   Gửi email reset password
POST   /api/v1/auth/reset-password    Đặt lại mật khẩu
GET    /api/v1/auth/me                Lấy thông tin user hiện tại
```

### 3.2. Profile & Address
```
GET    /api/v1/profile                Xem hồ sơ
PUT    /api/v1/profile                Cập nhật hồ sơ
GET    /api/v1/addresses              Danh sách địa chỉ
POST   /api/v1/addresses              Thêm địa chỉ
PUT    /api/v1/addresses/{id}         Sửa địa chỉ
DELETE /api/v1/addresses/{id}         Xóa địa chỉ
```

### 3.3. Categories
```
GET    /api/v1/categories             Danh sách danh mục
GET    /api/v1/categories/{slug}      Chi tiết danh mục
POST   /api/v1/admin/categories       [Admin] Tạo danh mục
PUT    /api/v1/admin/categories/{id}  [Admin] Sửa danh mục
DELETE /api/v1/admin/categories/{id}  [Admin] Xóa danh mục
```

### 3.4. Products
```
GET    /api/v1/products                    Danh sách (query: page, limit, category, search, sort, min_price, max_price)
GET    /api/v1/products/{slug}             Chi tiết sản phẩm (kèm variants, images, reviews)
GET    /api/v1/products/{id}/related       Sản phẩm liên quan
POST   /api/v1/admin/products              [Admin] Tạo sản phẩm
PUT    /api/v1/admin/products/{id}         [Admin] Sửa sản phẩm
DELETE /api/v1/admin/products/{id}         [Admin] Xóa sản phẩm
POST   /api/v1/admin/products/{id}/images  [Admin] Upload ảnh sản phẩm
POST   /api/v1/admin/products/{id}/variants [Admin] Thêm biến thể
PUT    /api/v1/admin/variants/{id}         [Admin] Sửa biến thể (giá, tồn kho)
```

### 3.5. Cart
```
GET    /api/v1/cart                   Xem giỏ hàng
POST   /api/v1/cart/items             Thêm sản phẩm vào giỏ
PUT    /api/v1/cart/items/{id}        Cập nhật số lượng
DELETE /api/v1/cart/items/{id}        Xóa khỏi giỏ
```

### 3.6. Wishlist
```
GET    /api/v1/wishlist               Danh sách yêu thích
POST   /api/v1/wishlist               Thêm vào wishlist
DELETE /api/v1/wishlist/{product_id}  Xóa khỏi wishlist
```

### 3.7. Orders & Checkout
```
POST   /api/v1/orders/checkout        Tạo đơn hàng từ giỏ hàng (áp coupon, chọn địa chỉ, phương thức thanh toán)
GET    /api/v1/orders                 Lịch sử đơn hàng của tôi
GET    /api/v1/orders/{id}            Chi tiết đơn hàng
POST   /api/v1/orders/{id}/cancel     Hủy đơn hàng
POST   /api/v1/orders/{id}/return     Yêu cầu trả hàng

GET    /api/v1/admin/orders           [Admin] Danh sách tất cả đơn hàng
PUT    /api/v1/admin/orders/{id}/status  [Admin] Cập nhật trạng thái đơn hàng
```

### 3.8. Payment
```
POST   /api/v1/payments/create        Tạo giao dịch thanh toán (trả về URL redirect nếu VNPay/Momo)
POST   /api/v1/payments/webhook       Webhook nhận callback từ cổng thanh toán
GET    /api/v1/payments/{order_id}    Trạng thái thanh toán của đơn hàng
```

### 3.9. Reviews
```
GET    /api/v1/products/{id}/reviews    Danh sách đánh giá của sản phẩm
POST   /api/v1/products/{id}/reviews    Viết đánh giá (yêu cầu đã mua)
DELETE /api/v1/admin/reviews/{id}       [Admin] Xóa đánh giá vi phạm
```

### 3.10. Coupons
```
POST   /api/v1/coupons/validate         Kiểm tra mã giảm giá hợp lệ
GET    /api/v1/admin/coupons            [Admin] Danh sách mã giảm giá
POST   /api/v1/admin/coupons            [Admin] Tạo mã giảm giá
PUT    /api/v1/admin/coupons/{id}       [Admin] Sửa mã giảm giá
DELETE /api/v1/admin/coupons/{id}       [Admin] Xóa mã giảm giá
```

### 3.11. Notifications
```
GET    /api/v1/notifications            Danh sách thông báo của tôi
PUT    /api/v1/notifications/{id}/read  Đánh dấu đã đọc
```

### 3.12. Admin Dashboard
```
GET    /api/v1/admin/dashboard/stats    Thống kê tổng quan (doanh thu, đơn hàng, khách hàng)
GET    /api/v1/admin/dashboard/revenue  Biểu đồ doanh thu theo thời gian
GET    /api/v1/admin/users              Danh sách khách hàng
PUT    /api/v1/admin/users/{id}/status  Khóa/mở tài khoản
```

---

## 4. LƯU Ý KHI TRIỂN KHAI

- **Row Level Security (RLS):** Bật RLS trên Supabase cho tất cả bảng — ví dụ user chỉ được đọc/sửa `orders`, `addresses`, `cart` của chính mình; policy riêng cho `role = admin`.
- **Snapshot dữ liệu đơn hàng:** `order_items` lưu lại tên sản phẩm, giá, thuộc tính variant tại thời điểm mua — tránh việc sửa sản phẩm sau này làm sai lệch lịch sử đơn hàng.
- **Tồn kho:** Khi tạo đơn hàng thành công, trừ `stock_quantity` trong `product_variants`; khi hủy đơn, cộng lại.
- **Giá biến thể:** Nếu sản phẩm không có biến thể, vẫn nên tạo 1 `product_variant` mặc định để thống nhất luồng xử lý giỏ hàng/đơn hàng.
- **FastAPI:** dùng `Supabase Python client` hoặc kết nối trực tiếp Postgres qua `asyncpg`/`SQLAlchemy` (khuyến nghị SQLAlchemy + Alembic để quản lý migration độc lập, dễ kiểm soát hơn dùng thẳng Supabase client trong backend).
- **Thứ tự code gợi ý:** `categories` → `products` (+ variants, images) → `cart` → `orders` (+ checkout logic) → `payments` → `reviews` → `admin dashboard`.
