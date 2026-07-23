# Shofy Fashion - Website Thời Trang & Tư Vấn AI

Shofy Fashion là hệ thống website thương mại điện tử chuyên nghiệp dành cho ngành hàng thời trang nam/nữ, tích hợp trợ lý thời trang thông minh AI Stylist (hỏi đáp và gợi ý sản phẩm trực quan) và chức năng Wishlist (danh sách yêu thích).

---

## 🛠️ Yêu cầu hệ thống

Trước khi bắt đầu cài đặt, hãy đảm bảo máy tính của bạn đã cài đặt các phần mềm sau:
- **Node.js** (Phiên bản v18 trở lên)
- **Python** (Phiên bản 3.10 trở lên)
- **Git**

---

## 📂 Cấu trúc dự án

Dự án bao gồm hai phần chính:
1. `backend/`: API Server xây dựng bằng **FastAPI** sử dụng **Supabase PostgreSQL** làm cơ sở dữ liệu.
2. `frontend/`: Ứng dụng client xây dựng bằng **Next.js 15 (Turbopack)** kết hợp **Tailwind CSS**.

---

## 👥 Hướng dẫn thiết lập dành cho thành viên trong nhóm (Collaborators)

Dành cho các thành viên khác trong nhóm 4 người khi kéo dự án về máy chạy dùng chung:

### Bước 1: Chấp nhận lời mời
1. Kiểm tra email cá nhân (hoặc thông báo trên trang GitHub) để bấm **Chấp nhận lời mời (Accept Invitation)** vào repository.
2. Kiểm tra email để bấm **Chấp nhận lời mời** tham gia tổ chức Supabase (sau khi được trưởng nhóm mời).

### Bước 2: Tải code về máy (Clone)
Mở terminal/git bash trên máy của bạn và chạy lệnh:
```bash
git clone https://github.com/Dekisugi-2112/Shofy-clothing-commerce-website.git
cd Shofy-clothing-commerce-website
```

### Bước 3: Cấu hình File môi trường (Vì các file này được bảo mật và không đưa lên Github)
1. **Tại thư mục `backend/`:**
   - Sao chép file `.env.example` thành file `.env`.
   - Vào dự án chung trên trang [Supabase Dashboard](https://supabase.com/dashboard) -> Chọn dự án -> Vào **Project Settings** -> **API** để lấy khóa dán vào file `.env`:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY` (nếu có)
2. **Tại thư mục `frontend/`:**
   - Sao chép file `.env.local.example` thành file `.env.local`.
   - Điền thông tin kết nối giống như trên.

### Bước 4: Khởi chạy Backend (FastAPI)
1. Mở terminal tại thư mục `backend/`.
2. Tạo và kích hoạt môi trường ảo:
   - *Windows:* `python -m venv .venv` sau đó chạy `.venv\Scripts\Activate.ps1`
   - *macOS/Linux:* `python3 -m venv .venv` sau đó chạy `source .venv/bin/activate`
3. Cài đặt các thư viện:
   ```bash
   pip install -r requirements.txt
   ```
4. Chạy server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   *(Backend sẽ chạy tại cổng `http://127.0.0.1:8000`)*

### Bước 5: Khởi chạy Frontend (Next.js)
1. Mở terminal thứ 2 tại thư mục `frontend/`.
2. Cài đặt các gói thư viện:
   ```bash
   npm install
   ```
3. Chạy client:
   ```bash
   npm run dev
   ```
   *(Frontend sẽ chạy tại cổng `http://localhost:3000`)*

> 💡 **Lưu ý cực kỳ quan trọng:** Vì dự án đã dùng chung Database và Storage trực tuyến trên Supabase, các thành viên **không cần chạy lệnh tạo lại bảng hoặc seed dữ liệu** (`seed_datasets.py` hay `seed_reviews.py`). Hệ thống đã có đầy đủ sản phẩm, ảnh và đánh giá mẫu sẵn sàng sử dụng.

---

## 💻 Các chức năng chính trong dự án

- **Trang chủ & Danh sách sản phẩm:** Trình diễn sản phẩm thời trang cao cấp từ Supabase, tích hợp lọc sản phẩm theo danh mục, khoảng giá, tìm kiếm thông tin và sắp xếp.
- **Chi tiết sản phẩm:** Xem mô tả, chọn kích cỡ/màu sắc, thêm vào giỏ hàng, viết đánh giá và xem đề xuất sản phẩm phối hợp liên quan.
- **Giỏ hàng & Thanh toán:** Quản lý giỏ hàng, áp dụng mã giảm giá và giả lập cổng thanh toán VNPAY trực quan.
- **AI Stylist 2.0:** Giao diện chatbot thời trang cao cấp, hỗ trợ người dùng trò chuyện tư vấn phong cách, có thể **gửi đính kèm sản phẩm cụ thể** bằng nút `➕` để nhận lời khuyên phối đồ.
- **Wishlist (Danh sách yêu thích):** Quản lý lưu giữ sản phẩm yêu thích cá nhân, hỗ trợ thêm nhanh vào giỏ hàng và đồng bộ dữ liệu người dùng qua Supabase.

---

## 👥 Hướng dẫn làm việc nhóm trên GitHub

1. Khi push code lên nhánh chính, **tuyệt đối không push các file chứa thông tin nhạy cảm** như `.env` (backend) và `.env.local` (frontend). File `.gitignore` ở gốc dự án đã được cài đặt tự động loại trừ các file này.
2. Khi các thành viên khác kéo code về (`git pull`), chỉ cần sao chép file `.env.example` và `.env.local.example` tương ứng rồi cấu hình thông tin kết nối Supabase cá nhân/nhóm là hệ thống có thể chạy ngay lập tức.
