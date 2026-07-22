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

## 🚀 Hướng dẫn cài đặt & Khởi chạy nhanh

### Bước 1: Clone dự án
```bash
git clone https://github.com/Dekisugi-2112/Shofy-clothing-commerce-website.git
cd Shofy-clothing-commerce-website
```

### Bước 2: Cài đặt và cấu hình Backend (FastAPI)

1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```

2. Tạo và kích hoạt môi trường ảo Python:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Cài đặt các gói thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```

4. Cấu hình file môi trường:
   - Sao chép file mẫu `.env.example` thành `.env`:
     ```bash
     copy .env.example .env     # Windows CMD
     # hoặc
     cp .env.example .env       # macOS/Linux/Git Bash
     ```
   - Mở file `.env` mới tạo và cập nhật các thông tin kết nối Supabase của nhóm bạn:
     - `SUPABASE_URL`
     - `SUPABASE_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY` (Sử dụng để chạy tính năng AI Stylist, nếu không có hệ thống sẽ tự động chạy chế độ dự phòng rule-based).

5. Khởi chạy Backend API Server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   API Server sẽ chạy tại địa chỉ: `http://127.0.0.1:8000`

---

### Bước 3: Khởi tạo dữ liệu (Seeding Database - Tùy chọn)

Nếu bạn muốn tạo lại dữ liệu mẫu cho cơ sở dữ liệu Supabase mới:
1. Đảm bảo đã kích hoạt môi trường ảo Python và đang ở trong thư mục `backend`.
2. Tạo cấu trúc bảng bằng cách chạy các file SQL trong thư mục `backend/database_sql/` theo thứ tự từ `01` đến `09` trên giao diện **SQL Editor** của Supabase.
3. Chạy file python để đổ dữ liệu mẫu:
   ```bash
   python seed_datasets.py   # Tạo danh mục và sản phẩm mẫu
   python seed_reviews.py    # Tạo đánh giá sản phẩm mẫu cho AI
   ```

---

### Bước 4: Cài đặt và cấu hình Frontend (Next.js)

1. Mở một cửa sổ terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```

2. Cài đặt các gói thư viện Node.js:
   ```bash
   npm install
   ```

3. Cấu hình file môi trường:
   - Sao chép file `.env.local.example` thành `.env.local`:
     ```bash
     copy .env.local.example .env.local     # Windows CMD
     # hoặc
     cp .env.local.example .env.local       # macOS/Linux/Git Bash
     ```
   - Mở file `.env.local` mới tạo và điền địa chỉ Backend cùng khóa Supabase của bạn.

4. Khởi chạy dự án ở chế độ phát triển (Development):
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000`

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