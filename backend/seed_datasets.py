import os
import sys
import uuid
import json
import re
import httpx
from dotenv import load_dotenv
from supabase import create_client

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong file backend/.env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Đường dẫn datasets
SET1_DIR = r"d:\AI_My_Project\website-shofy-clothing-ecommerce\tài liệu thiết kế\set1\frontend_assets"
SET2_DIR = r"d:\AI_My_Project\website-shofy-clothing-ecommerce\tài liệu thiết kế\set2\Frontend_Assets"

def parse_all_products(filepath):
    if not os.path.exists(filepath):
        print(f"File không tồn tại: {filepath}")
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    blocks = re.findall(r'\{\s*id:\s*\d+.*?\}', content, re.DOTALL)
    products = []
    for b in blocks:
        try:
            pid_match = re.search(r'id:\s*(\d+)', b)
            pid = pid_match.group(1) if pid_match else None
            
            name_match = re.search(r'name:\s*"([^"]+)"', b)
            name = name_match.group(1) if name_match else None
            
            category_match = re.search(r'category:\s*"([^"]+)"', b)
            category = category_match.group(1) if category_match else None
            
            image_var_match = re.search(r'image:\s*([a-zA-Z0-9_]+)', b)
            image_var = image_var_match.group(1) if image_var_match else None
            
            new_price_match = re.search(r'new_price:\s*([\d.]+)', b)
            new_price = new_price_match.group(1) if new_price_match else None
            
            if not (pid and name and category and image_var and new_price):
                print(f"  ⚠ Block thiếu trường: pid={pid}, name={name}, cat={category}, img={image_var}, price={new_price}")
                print(f"  Content: {b}")
                continue
                
            img_num = re.search(r'p(\d+)_img', image_var).group(1)
            img_filename = f"product_{img_num}.png"
            
            products.append({
                "id": pid,
                "name": name,
                "category": category,
                "image_filename": img_filename,
                "price": float(new_price)
            })
        except Exception as e:
            print(f"Lỗi phân tích block sản phẩm: {e}")
            print(f"Block content: {b}")
    return products

def parse_assets_products(filepath):
    if not os.path.exists(filepath):
        print(f"File không tồn tại: {filepath}")
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    blocks = re.findall(r'\{\s*_id:\s*"[^"]+".*?\}', content, re.DOTALL)
    products = []
    for b in blocks:
        try:
            pid_match = re.search(r'_id:\s*"([^"]+)"', b)
            pid = pid_match.group(1) if pid_match else None
            
            name_match = re.search(r'name:\s*"([^"]+)"', b)
            name = name_match.group(1) if name_match else None
            
            description_match = re.search(r'description:\s*"([^"]+)"', b)
            description = description_match.group(1) if description_match else name
            
            price_match = re.search(r'price:\s*(\d+)', b)
            price = price_match.group(1) if price_match else None
            
            img_match = re.search(r'image:\s*\[([^\]]+)\]', b)
            images = []
            if img_match:
                img_vars = [x.strip() for x in img_match.group(1).split(',')]
                for iv in img_vars:
                    images.append(f"{iv}.png")
                    
            category_match = re.search(r'category:\s*"([^"]+)"', b)
            category = category_match.group(1) if category_match else None
            
            sub_category_match = re.search(r'subCategory:\s*"([^"]+)"', b)
            sub_category = sub_category_match.group(1) if sub_category_match else "Topwear"
            
            sizes_match = re.search(r'sizes:\s*\[([^\]]+)\]', b)
            sizes = ["S", "M", "L"]
            if sizes_match:
                sizes = [x.strip().replace('"', '').replace("'", "") for x in sizes_match.group(1).split(',')]
                
            if not (pid and name and price and category):
                # Khai báo không in các block không liên quan nếu chúng chỉ là object phụ
                continue
                
            products.append({
                "id": pid,
                "name": name,
                "description": description,
                "price": float(price),
                "images": images,
                "category": category,
                "sub_category": sub_category,
                "sizes": sizes
            })
        except Exception as e:
            print(f"Lỗi phân tích block assets: {e}")
            print(f"Block content: {b}")
    return products

def upload_image_to_supabase(local_path, bucket_name, storage_path):
    """
    Cố gắng upload ảnh lên Supabase Storage.
    Trả về URL public nếu thành công, hoặc None nếu thất bại.
    """
    if not os.path.exists(local_path):
        return None
    try:
        with open(local_path, "rb") as f:
            file_data = f.read()
        
        # Thử upload ảnh
        supabase.storage.from_(bucket_name).upload(
            storage_path, 
            file_data, 
            file_options={"content-type": "image/png", "x-upsert": "true"}
        )
        # Sinh public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{storage_path}"
        return public_url
    except Exception as e:
        # Nếu lỗi (như chưa tạo bucket), trả về None để dùng local fallback
        return None

def classify_category(cat_name, title, sub_cat=""):
    """
    Phân loại sản phẩm vào 14 danh mục con của dự án
    """
    cat = cat_name.lower()
    title_l = title.lower()
    sub_l = sub_cat.lower()
    
    # 1. Thời trang Nam
    if cat == "men" or cat == "mens":
        if "shirt" in title_l or "polo" in title_l:
            return "a2000000-0000-0000-0000-000000000000" # Áo sơ mi Nam
        elif "jean" in title_l or "pant" in title_l or "trouser" in title_l or "bottom" in sub_l:
            return "a3000000-0000-0000-0000-000000000000" # Quần jean Nam
        elif "jacket" in title_l or "coat" in title_l or "hoodie" in title_l or "winter" in sub_l:
            return "a4000000-0000-0000-0000-000000000000" # Áo khoác Nam
        else:
            return "a1000000-0000-0000-0000-000000000000" # Áo thun Nam

    # 2. Thời trang Nữ
    elif cat == "women" or cat == "womens":
        if "dress" in title_l or "skirt" in title_l or "gown" in title_l:
            return "b2000000-0000-0000-0000-000000000000" # Váy đầm Nữ
        elif "blouse" in title_l or "blouse" in sub_l or "shirt" in title_l:
            return "b4000000-0000-0000-0000-000000000000" # Áo kiểu / blouse Nữ
        elif "jean" in title_l or "pant" in title_l or "trouser" in title_l or "bottom" in sub_l:
            return "b3000000-0000-0000-0000-000000000000" # Quần jean Nữ
        else:
            return "b1000000-0000-0000-0000-000000000000" # Áo thun Nữ

    # 3. Mặc định cho Kids/Trẻ em hoặc loại khác -> phân bổ theo giới tính/tên gọi
    else:
        if "boy" in title_l:
            return "a1000000-0000-0000-0000-000000000000" # Áo thun Nam
        else:
            return "b1000000-0000-0000-0000-000000000000" # Áo thun Nữ

def seed_dataset_products():
    # Tự động tạo bucket 'products' công khai nếu chưa tồn tại
    try:
        supabase.storage.create_bucket("products", options={"public": True})
        print("  ✓ Đã tự động khởi tạo thành công bucket 'products' công khai trên Storage.")
    except Exception:
        pass

    print("=== BẮT ĐẦU PHÂN TÍCH VÀ NẠP SẢN PHẨM DATASET (SET 1 & SET 2) ===")
    
    # 1. Phân tích Set 1
    print("\n[Phân tích Set 1]")
    set1_all_prods = parse_all_products(os.path.join(SET1_DIR, "all_product.js"))
    set1_assets_prods = parse_assets_products(os.path.join(SET1_DIR, "assets.js"))
    print(f"  ✓ Tìm thấy {len(set1_all_prods)} sản phẩm trong all_product.js")
    print(f"  ✓ Tìm thấy {len(set1_assets_prods)} sản phẩm trong assets.js")
    
    # 2. Phân tích Set 2
    print("\n[Phân tích Set 2]")
    set2_all_prods = parse_all_products(os.path.join(SET2_DIR, "all_product.js"))
    print(f"  ✓ Tìm thấy {len(set2_all_prods)} sản phẩm trong all_product.js")

    # Clean previous dataset products (to avoid duplicates)
    try:
        supabase.table("products").delete().ilike("name", "Set1 -%").execute()
        supabase.table("products").delete().ilike("name", "Set2 -%").execute()
        print("  ✓ Đã dọn dẹp các sản phẩm dataset cũ trước khi nạp mới.")
    except Exception as clean_err:
        print(f"  ⚠ Lỗi khi dọn dẹp sản phẩm cũ: {clean_err}")

    products_to_insert = []
    images_to_insert = []
    variants_to_insert = []
    
    prod_idx = 500  # Bắt đầu counter mới tránh trùng lặp
    
    # --- Xử lý Set 1: all_product.js ---
    print("\n-> Đang xử lý Set 1 (all_product.js)...")
    for p in set1_all_prods:
        prod_uuid = str(uuid.uuid4())
        cat_id = classify_category(p["category"], p["name"])
        
        # Cố gắng upload ảnh lên supabase storage
        local_img_path = os.path.join(SET1_DIR, p["image_filename"])
        storage_path = f"set1_{p['image_filename']}"
        uploaded_url = upload_image_to_supabase(local_img_path, "products", storage_path)
        
        # Chọn URL ảnh: ưu tiên supabase storage, nếu lỗi dùng local public path
        img_url = uploaded_url if uploaded_url else f"/assets/set1/{p['image_filename']}"
        
        slug = p["name"].lower().replace(" ", "-").replace("/", "-")
        
        products_to_insert.append({
            "id": prod_uuid,
            "category_id": cat_id,
            "name": f"Set1 - {p['name']}",
            "slug": f"{slug}-{prod_idx}",
            "description": f"Sản phẩm thời trang cao cấp thuộc bộ sưu tập Set 1. Chất liệu thoáng mát, phom dáng chuẩn, mang lại cảm giác thoải mái khi mặc.",
            "base_price": float(p["price"] * 25000),  # Quy đổi sang VNĐ
            "status": "active",
            "avg_rating": 4.5
        })
        
        images_to_insert.append({
            "product_id": prod_uuid,
            "image_url": img_url,
            "is_primary": True,
            "display_order": 1
        })
        
        # Tạo 3 biến thể kích thước
        for size in ["M", "L", "XL"]:
            variants_to_insert.append({
                "product_id": prod_uuid,
                "sku": f"SKU-SET1-{prod_idx}-{size}",
                "attributes": {"size": size, "color": "Mặc định"},
                "price": float(p["price"] * 25000),
                "stock_quantity": 40
            })
            
        prod_idx += 1

    # --- Xử lý Set 1: assets.js ---
    print("-> Đang xử lý Set 1 (assets.js)...")
    for p in set1_assets_prods:
        prod_uuid = str(uuid.uuid4())
        cat_id = classify_category(p["category"], p["name"], p["sub_category"])
        
        slug = p["name"].lower().replace(" ", "-").replace("/", "-")
        
        products_to_insert.append({
            "id": prod_uuid,
            "category_id": cat_id,
            "name": f"Set1 - {p['name']}",
            "slug": f"{slug}-{prod_idx}",
            "description": p["description"] + " (Sản phẩm thuộc bộ sưu tập cao cấp Set 1).",
            "base_price": float(p["price"] * 25000),
            "status": "active",
            "avg_rating": 4.8
        })
        
        # Chèn nhiều ảnh sản phẩm
        for img_order, img_file in enumerate(p["images"]):
            local_img_path = os.path.join(SET1_DIR, img_file)
            storage_path = f"set1_{img_file}"
            uploaded_url = upload_image_to_supabase(local_img_path, "products", storage_path)
            
            img_url = uploaded_url if uploaded_url else f"/assets/set1/{img_file}"
            
            images_to_insert.append({
                "product_id": prod_uuid,
                "image_url": img_url,
                "is_primary": (img_order == 0),
                "display_order": img_order + 1
            })
            
        # Tạo biến thể kích thước / màu sắc
        colors = ["Đen", "Trắng", "Xanh"]
        for s_idx, size in enumerate(p["sizes"][:3]):
            color = colors[s_idx % len(colors)]
            variants_to_insert.append({
                "product_id": prod_uuid,
                "sku": f"SKU-SET1-{prod_idx}-{size}-{color}",
                "attributes": {"size": size, "color": color},
                "price": float(p["price"] * 25000),
                "stock_quantity": 50
            })
            
        prod_idx += 1

    # --- Xử lý Set 2: all_product.js ---
    print("-> Đang xử lý Set 2 (all_product.js)...")
    for p in set2_all_prods:
        prod_uuid = str(uuid.uuid4())
        cat_id = classify_category(p["category"], p["name"])
        
        local_img_path = os.path.join(SET2_DIR, p["image_filename"])
        storage_path = f"set2_{p['image_filename']}"
        uploaded_url = upload_image_to_supabase(local_img_path, "products", storage_path)
        
        img_url = uploaded_url if uploaded_url else f"/assets/set2/{p['image_filename']}"
        
        slug = p["name"].lower().replace(" ", "-").replace("/", "-")
        
        products_to_insert.append({
            "id": prod_uuid,
            "category_id": cat_id,
            "name": f"Set2 - {p['name']}",
            "slug": f"{slug}-{prod_idx}",
            "description": f"Sản phẩm thời trang cao cấp thuộc bộ sưu tập Set 2. Thiết kế độc đáo, đường may tinh xảo và vô cùng thời thượng.",
            "base_price": float(p["price"] * 25000),
            "status": "active",
            "avg_rating": 4.6
        })
        
        images_to_insert.append({
            "product_id": prod_uuid,
            "image_url": img_url,
            "is_primary": True,
            "display_order": 1
        })
        
        for size in ["M", "L", "XL"]:
            variants_to_insert.append({
                "product_id": prod_uuid,
                "sku": f"SKU-SET2-{prod_idx}-{size}",
                "attributes": {"size": size, "color": "Mặc định"},
                "price": float(p["price"] * 25000),
                "stock_quantity": 30
            })
            
        prod_idx += 1

    # 4. Thực thi chèn vào Supabase Database
    print(f"\n-> Đang chèn thêm {len(products_to_insert)} sản phẩm mới từ datasets...")
    for k in range(0, len(products_to_insert), 50):
        supabase.table("products").insert(products_to_insert[k:k+50]).execute()
    print("  ✓ Đã chèn sản phẩm mới!")

    print(f"-> Đang chèn thêm {len(images_to_insert)} ảnh mới...")
    for k in range(0, len(images_to_insert), 50):
        supabase.table("product_images").insert(images_to_insert[k:k+50]).execute()
    print("  ✓ Đã chèn ảnh mới!")

    print(f"-> Đang chèn thêm {len(variants_to_insert)} biến thể mới...")
    for k in range(0, len(variants_to_insert), 50):
        supabase.table("product_variants").insert(variants_to_insert[k:k+50]).execute()
    print("  ✓ Đã chèn biến thể mới!")

    print("\n✅ HOÀN TẤT NẠP DỮ LIỆU DATASET THÀNH CÔNG!")

if __name__ == "__main__":
    seed_dataset_products()
