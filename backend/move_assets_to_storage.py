import os
import sys
import shutil
from dotenv import load_dotenv
from supabase import create_client

# Reconfigure stdout for UTF-8 encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Thiếu SUPABASE_URL hoặc SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY trong file .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

FRONTEND_ASSETS = r"d:\AI_My_Project\website-shofy-clothing-ecommerce\frontend\public\assets"
SET1_DIR = os.path.join(FRONTEND_ASSETS, "set1")
SET2_DIR = os.path.join(FRONTEND_ASSETS, "set2")

def get_mime_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".png":
        return "image/png"
    elif ext in [".jpg", ".jpeg"]:
        return "image/jpeg"
    elif ext == ".svg":
        return "image/svg+xml"
    elif ext == ".webp":
        return "image/webp"
    return "application/octet-stream"

def migrate():
    bucket_name = "products"
    
    # 1. Check bucket access
    print(f"=== Đang truy cập bucket '{bucket_name}' trên Supabase Storage... ===")
    try:
        # Check if bucket exists, if not create it
        try:
            supabase.storage.get_bucket(bucket_name)
            print(f"  ✓ Tìm thấy bucket '{bucket_name}'.")
        except Exception:
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"  ✓ Đã khởi tạo mới bucket '{bucket_name}' công khai.")
            
        # 2. List and delete all existing files in bucket
        print(f"\n-> Đang dọn dẹp (xóa toàn bộ ảnh cũ) trong bucket '{bucket_name}'...")
        bucket = supabase.storage.from_(bucket_name)
        
        # Paginate lists if there are many files
        files_to_remove = []
        limit = 100
        offset = 0
        while True:
            res_files = bucket.list(options={"limit": limit, "offset": offset})
            if not res_files:
                break
            files_to_remove.extend([f["name"] for f in res_files if f["name"] != ".emptyFolderPlaceholder"])
            if len(res_files) < limit:
                break
            offset += limit
            
        if files_to_remove:
            print(f"  -> Tìm thấy {len(files_to_remove)} tệp tin cũ. Đang tiến hành xóa...")
            # Supabase remove takes a list of paths
            # Delete in chunks of 50 to avoid request body size limits
            for i in range(0, len(files_to_remove), 50):
                chunk = files_to_remove[i:i+50]
                bucket.remove(chunk)
            print("  ✓ Đã dọn dẹp sạch sẽ bucket.")
        else:
            print("  ✓ Bucket hiện tại trống, không có ảnh cũ cần xóa.")
            
    except Exception as e:
        print(f"  ❌ Lỗi khi làm việc với bucket Supabase: {e}")
        sys.exit(1)
        
    # 3. Upload files from set1
    uploaded_count = 0
    failed_uploads = []
    
    if os.path.exists(SET1_DIR):
        print(f"\n-> Đang tải ảnh từ thư mục frontend/set1 lên bucket '{bucket_name}'...")
        files = [f for f in os.listdir(SET1_DIR) if os.path.isfile(os.path.join(SET1_DIR, f))]
        for idx, filename in enumerate(files):
            local_path = os.path.join(SET1_DIR, filename)
            storage_path = f"set1_{filename}"
            mime_type = get_mime_type(filename)
            
            try:
                with open(local_path, "rb") as f:
                    file_data = f.read()
                
                # Upload with upsert=true
                bucket.upload(
                    storage_path, 
                    file_data, 
                    file_options={"content-type": mime_type, "x-upsert": "true"}
                )
                uploaded_count += 1
                if idx % 10 == 0 or idx == len(files) - 1:
                    print(f"  [Set1] Tiến trình: {idx + 1}/{len(files)} ảnh...")
            except Exception as upload_err:
                print(f"  ❌ Lỗi upload {filename}: {upload_err}")
                failed_uploads.append(("set1", filename, str(upload_err)))
    else:
        print("  ⚠ Thư mục frontend/public/assets/set1 không tồn tại.")
        
    # 4. Upload files from set2
    if os.path.exists(SET2_DIR):
        print(f"\n-> Đang tải ảnh từ thư mục frontend/set2 lên bucket '{bucket_name}'...")
        files = [f for f in os.listdir(SET2_DIR) if os.path.isfile(os.path.join(SET2_DIR, f))]
        for idx, filename in enumerate(files):
            local_path = os.path.join(SET2_DIR, filename)
            storage_path = f"set2_{filename}"
            mime_type = get_mime_type(filename)
            
            try:
                with open(local_path, "rb") as f:
                    file_data = f.read()
                
                bucket.upload(
                    storage_path, 
                    file_data, 
                    file_options={"content-type": mime_type, "x-upsert": "true"}
                )
                uploaded_count += 1
                if idx % 10 == 0 or idx == len(files) - 1:
                    print(f"  [Set2] Tiến trình: {idx + 1}/{len(files)} ảnh...")
            except Exception as upload_err:
                print(f"  ❌ Lỗi upload {filename}: {upload_err}")
                failed_uploads.append(("set2", filename, str(upload_err)))
    else:
        print("  ⚠ Thư mục frontend/public/assets/set2 không tồn tại.")
        
    print(f"\n=== Kết quả tải ảnh lên: Thành công {uploaded_count} ảnh, Thất bại {len(failed_uploads)} ảnh. ===")
    
    # 5. Delete local folders if no failures
    if len(failed_uploads) == 0 and uploaded_count > 0:
        print("\n-> Tất cả ảnh đã được tải lên thành công. Bắt đầu xóa ảnh cục bộ ở frontend...")
        try:
            if os.path.exists(SET1_DIR):
                shutil.rmtree(SET1_DIR)
                print("  ✓ Đã xóa thư mục frontend/public/assets/set1.")
            if os.path.exists(SET2_DIR):
                shutil.rmtree(SET2_DIR)
                print("  ✓ Đã xóa thư mục frontend/public/assets/set2.")
            print("\n✅ HOÀN TẤT DI CHUYỂN ẢNH THÀNH CÔNG!")
        except Exception as del_err:
            print(f"  ❌ Lỗi khi xóa thư mục cục bộ: {del_err}")
    else:
        if len(failed_uploads) > 0:
            print("\n❌ CẢNH BÁO: Không xóa ảnh cục bộ vì có lỗi xảy ra trong quá trình upload.")
            for folder, fn, err in failed_uploads:
                print(f"    - {folder}/{fn}: {err}")
        else:
            print("\n⚠ Không có ảnh nào được tải lên, giữ nguyên ảnh cục bộ.")

if __name__ == "__main__":
    migrate()
