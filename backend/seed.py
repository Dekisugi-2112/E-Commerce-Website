import os
import sys
import uuid
import json
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

def fetch_platzi_products():
    """
    Gọi REST API của Platzi Fake Store API để lấy dữ liệu sản phẩm thời trang thật.
    """
    fetched_products = []
    # Các Category ID thời trang trên Platzi:
    # 1: Clothes (Quần áo)
    # 4: Shoes (Giày dép)
    # 5: Miscellaneous (Phụ kiện, túi xách...)
    categories_to_fetch = [1, 4, 5]
    with httpx.Client(timeout=15.0) as client:
        for cat_id in categories_to_fetch:
            try:
                url = f"https://api.escuelajs.co/api/v1/products/?categoryId={cat_id}"
                response = client.get(url)
                if response.status_code == 200:
                    products = response.json()
                    fetched_products.extend(products)
                    print(f"  ✓ Đã lấy {len(products)} sản phẩm từ Platzi API Category ID: {cat_id}")
                else:
                    print(f"  ⚠ Lỗi lấy danh mục Platzi {cat_id}: Mã trạng thái {response.status_code}")
            except Exception as e:
                print(f"  ⚠ Lỗi kết nối Platzi API khi lấy danh mục {cat_id}: {e}")
    return fetched_products

def classify_platzi_product(p):
    """
    Phân loại sản phẩm từ Platzi API vào 14 danh mục con của dự án dựa trên keyword
    """
    title = p.get("title", "").lower()
    description = p.get("description", "").lower()
    cat_name = p.get("category", {}).get("name", "").lower()
    cat_id = p.get("category", {}).get("id")
    
    # 1. Clothes (Category ID 1)
    if cat_id == 1 or "clothes" in cat_name:
        if "dress" in title or "dress" in description or "skirt" in title or "gown" in title:
            return "b2000000-0000-0000-0000-000000000000" # Váy đầm Nữ
        elif "blouse" in title or "lace" in title or "crop" in title or "blouse" in description:
            return "b4000000-0000-0000-0000-000000000000" # Áo kiểu / blouse Nữ
        elif "jean" in title or "pant" in title or "trouser" in title or "denim" in title:
            # Quần jean
            if "women" in title or "women" in description or "lady" in title or "girl" in title:
                return "b3000000-0000-0000-0000-000000000000" # Quần jean Nữ
            else:
                return "a3000000-0000-0000-0000-000000000000" # Quần jean Nam
        elif "jacket" in title or "coat" in title or "hoodie" in title or "sweater" in title or "windbreaker" in title:
            return "a4000000-0000-0000-0000-000000000000" # Áo khoác Nam
        elif "t-shirt" in title or "tee" in title or "polo" in title or "thun" in title:
            # Áo thun
            if "women" in title or "women" in description or "lady" in title or "girl" in title:
                return "b1000000-0000-0000-0000-000000000000" # Áo thun Nữ
            else:
                return "a1000000-0000-0000-0000-000000000000" # Áo thun Nam
        else:
            # Mặc định chia vào Sơ mi Nam
            return "a2000000-0000-0000-0000-000000000000"

    # 2. Shoes (Category ID 4)
    elif cat_id == 4 or "shoes" in cat_name:
        if "boot" in title or "boot" in description:
            return "c3000000-0000-0000-0000-000000000000" # Giày boots
        elif "sandal" in title or "sandal" in description or "slipper" in title or "flip" in title:
            return "c2000000-0000-0000-0000-000000000000" # Dép / sandal
        else:
            return "c1000000-0000-0000-0000-000000000000" # Giày sneaker

    # 3. Miscellaneous (Category ID 5)
    elif cat_id == 5 or "miscellaneous" in cat_name:
        if "bag" in title or "handbag" in title or "pack" in title or "purse" in title:
            return "d1000000-0000-0000-0000-000000000000" # Túi xách
        elif "hat" in title or "cap" in title or "beanie" in title or "visor" in title:
            return "d2000000-0000-0000-0000-000000000000" # Nón / mũ
        elif "belt" in title or "strap" in title:
            return "d3000000-0000-0000-0000-000000000000" # Thắt lưng

    return None

def translate_title_desc(title, desc):
    """
    Quy đổi dịch nghĩa tiêu đề và mô tả tiếng Anh sang tiếng Việt cơ bản
    """
    translations = {
        "t-shirt": "Áo thun thời trang",
        "shirt": "Áo sơ mi cao cấp",
        "jeans": "Quần jeans năng động",
        "dress": "Đầm nữ quyến rũ",
        "shoes": "Giày thời trang",
        "sneakers": "Giày sneaker thể thao",
        "boots": "Giày boots cá tính",
        "sandals": "Sandal quai ngang",
        "bag": "Túi xách cao cấp",
        "hat": "Mũ thời trang",
        "belt": "Thắt lưng da"
    }
    
    vn_title = title
    matched_vn = []
    for en, vn in translations.items():
        if en in title.lower():
            matched_vn.append(vn)
            
    if matched_vn:
        vn_title = f"{matched_vn[0]} - {title}"
        
    vn_desc = f"{desc} (Sản phẩm nhập khẩu chính hãng chất lượng cao, phân phối độc quyền bởi Shofy Fashion)."
    return vn_title, vn_desc

def get_color_images(cat_id, colors):
    """
    Ánh xạ từng màu sắc cụ thể của danh mục sản phẩm tới một ảnh Unsplash chất lượng cao riêng biệt,
    nhằm đảm bảo khi chọn màu trên frontend, ảnh chính sẽ chuyển đổi tương ứng và không bị lỗi tải ảnh.
    """
    color_mapping = {
        # Áo thun Nam
        "a1000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
            "Đen": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800",
            "Xanh Navy": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
            "Kem Beige": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800"
        },
        # Áo sơ mi Nam
        "a2000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
            "Đen": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
            "Xanh Navy": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800",
            "Kem Beige": "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800"
        },
        # Quần jean Nam
        "a3000000-0000-0000-0000-000000000000": {
            "Xanh Indigo": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
            "Đen Xám": "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800",
            "Xanh Nhạt": "https://images.unsplash.com/photo-1582552938357-32b906df40cd?w=800"
        },
        # Áo khoác Nam
        "a4000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800",
            "Đen": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
            "Xanh Navy": "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800",
            "Kem Beige": "https://images.unsplash.com/photo-1620012253295-c05518e993be?w=800"
        },
        # Áo thun Nữ
        "b1000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800",
            "Đen": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
            "Xanh Navy": "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800",
            "Kem Beige": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800"
        },
        # Váy đầm Nữ
        "b2000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800",
            "Đen": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",
            "Xanh Navy": "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=800",
            "Kem Beige": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"
        },
        # Quần jean Nữ
        "b3000000-0000-0000-0000-000000000000": {
            "Xanh Indigo": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
            "Đen Xám": "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800",
            "Xanh Nhạt": "https://images.unsplash.com/photo-1582552938357-32b906df40cd?w=800"
        },
        # Áo kiểu / blouse Nữ
        "b4000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800",
            "Đen": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800",
            "Xanh Navy": "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800",
            "Kem Beige": "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800"
        },
        # Giày sneaker
        "c1000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800",
            "Đen": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800",
            "Nâu Da Bò": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800"
        },
        # Dép / sandal
        "c2000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
            "Đen": "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800",
            "Nâu Da Bò": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800"
        },
        # Giày boots
        "c3000000-0000-0000-0000-000000000000": {
            "Trắng": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800",
            "Đen": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
            "Nâu Da Bò": "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800"
        },
        # Túi xách
        "d1000000-0000-0000-0000-000000000000": {
            "Đen": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800",
            "Nâu Cổ Điển": "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800",
            "Be Sáng": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800"
        },
        # Nón / mũ
        "d2000000-0000-0000-0000-000000000000": {
            "Đen": "https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=800",
            "Nâu Cổ Điển": "https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800",
            "Be Sáng": "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=800"
        },
        # Thắt lưng
        "d3000000-0000-0000-0000-000000000000": {
            "Đen": "https://images.unsplash.com/photo-1624222247344-550fb8ecfbd4?w=800",
            "Nâu Cổ Điển": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
            "Be Sáng": "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800"
        }
    }
    
    mapping = color_mapping.get(cat_id, {})
    image_list = []
    
    for c in colors:
        url = mapping.get(c)
        if url:
            image_list.append(url)
            
    if not image_list:
        image_list = ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"]
        
    return image_list

def seed_database():
    print("Bắt đầu dọn dẹp dữ liệu cũ theo ràng buộc khóa ngoại...")
    
    try:
        supabase.table("product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("  ✓ Đã xóa ảnh sản phẩm")
        supabase.table("product_variants").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("  ✓ Đã xóa các biến thể sản phẩm")
        supabase.table("products").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("  ✓ Đã xóa các sản phẩm")
        
        supabase.table("categories").delete().not_.is_("parent_id", "null").execute()
        supabase.table("categories").delete().is_("parent_id", "null").execute()
        print("  ✓ Đã xóa toàn bộ danh mục")
    except Exception as e:
        print(f"Lưu ý khi dọn dẹp dữ liệu: {e}")
        raise e

    print("\nBắt đầu nạp danh mục thời trang phân cấp mới...")

    parent_categories = [
        {"id": "a0000000-0000-0000-0000-000000000000", "name": "Thời trang Nam", "slug": "thoi-trang-nam", "parent_id": None, "image_url": "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800"},
        {"id": "b0000000-0000-0000-0000-000000000000", "name": "Thời trang Nữ", "slug": "thoi-trang-nu", "parent_id": None, "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"},
        {"id": "c0000000-0000-0000-0000-000000000000", "name": "Giày dép", "slug": "giay-dep", "parent_id": None, "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800"},
        {"id": "d0000000-0000-0000-0000-000000000000", "name": "Phụ kiện", "slug": "phu-kien", "parent_id": None, "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800"}
    ]

    for parent in parent_categories:
        supabase.table("categories").insert(parent).execute()
        print(f"  ✓ Đã nạp danh mục cha: {parent['name']}")

    sub_categories = [
        {"id": "a1000000-0000-0000-0000-000000000000", "name": "Áo thun", "slug": "ao-thun-nam", "parent_id": "a0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"},
        {"id": "a2000000-0000-0000-0000-000000000000", "name": "Áo sơ mi", "slug": "ao-so-mi-nam", "parent_id": "a0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800"},
        {"id": "a3000000-0000-0000-0000-000000000000", "name": "Quần jean", "slug": "quan-jean-nam", "parent_id": "a0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800"},
        {"id": "a4000000-0000-0000-0000-000000000000", "name": "Áo khoác", "slug": "ao-khoac-nam", "parent_id": "a0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800"},

        {"id": "b1000000-0000-0000-0000-000000000000", "name": "Áo thun", "slug": "ao-thun-nu", "parent_id": "b0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800"},
        {"id": "b2000000-0000-0000-0000-000000000000", "name": "Váy đầm", "slug": "vay-dam-nu", "parent_id": "b0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800"},
        {"id": "b3000000-0000-0000-0000-000000000000", "name": "Quần jean", "slug": "quan-jean-nu", "parent_id": "b0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800"},
        {"id": "b4000000-0000-0000-0000-000000000000", "name": "Áo kiểu / blouse", "slug": "ao-kieu-blouse-nu", "parent_id": "b0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800"},

        {"id": "c1000000-0000-0000-0000-000000000000", "name": "Giày sneaker", "slug": "giay-sneaker", "parent_id": "c0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800"},
        {"id": "c2000000-0000-0000-0000-000000000000", "name": "Dép / sandal", "slug": "dep-sandal", "parent_id": "c0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800"},
        {"id": "c3000000-0000-0000-0000-000000000000", "name": "Giày boots", "slug": "giay-boots", "parent_id": "c0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800"},

        {"id": "d1000000-0000-0000-0000-000000000000", "name": "Túi xách", "slug": "tui-xach", "parent_id": "d0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800"},
        {"id": "d2000000-0000-0000-0000-000000000000", "name": "Nón / mũ", "slug": "non-mu", "parent_id": "d0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=800"},
        {"id": "d3000000-0000-0000-0000-000000000000", "name": "Thắt lưng", "slug": "that-lung", "parent_id": "d0000000-0000-0000-0000-000000000000", "image_url": "https://images.unsplash.com/photo-1624222247344-550fb8ecfbd4?w=800"}
    ]

    for sub in sub_categories:
        supabase.table("categories").insert(sub).execute()
        print(f"  ✓ Đã nạp danh mục con: {sub['name']} -> {sub['slug']}")

    print("\n✅ Đã hoàn tất nạp dữ liệu danh mục phân cấp!")

    # Tải dữ liệu từ API ngoài Platzi Fake Store API (Danh mục 1, 4, 5)
    print("\nĐang gọi Platzi Fake Store API để lấy sản phẩm thời trang thật...")
    api_products = fetch_platzi_products()
    
    # Phân nhóm sản phẩm API theo danh mục con
    api_products_by_cat = {cat["id"]: [] for cat in sub_categories}
    for p in api_products:
        cat_id = classify_platzi_product(p)
        if cat_id and cat_id in api_products_by_cat:
            api_products_by_cat[cat_id].append(p)
            
    print("\nBắt đầu xử lý nạp sản phẩm và biến thể...")
    
    products_to_insert = []
    variants_to_insert = []
    images_to_insert = []
    
    prod_counter = 1
    
    for sub in sub_categories:
        cat_id = sub["id"]
        cat_api_prods = api_products_by_cat.get(cat_id, [])
        final_prods = []
        
        # 1. Chuyển đổi và chuẩn hóa dữ liệu từ Platzi API ngoài
        for p in cat_api_prods:
            api_title = p.get("title", "")
            api_desc = p.get("description", "")
            api_price_usd = p.get("price", 20.0)
            
            # Nhân tỷ giá USD -> VNĐ (ví dụ: * 25000) và làm tròn tiền
            price_vnd = round(api_price_usd * 25000, -3)
            if price_vnd < 50000:
                price_vnd = 150000.00
                
            title_vn, desc_vn = translate_title_desc(api_title, api_desc)
            
            # Tự động gán slug
            api_slug = p.get("slug")
            if not api_slug:
                api_slug = api_title.lower().replace(" ", "-").replace("/", "-")
            
            final_prods.append({
                "name": title_vn,
                "slug": api_slug,
                "description": desc_vn,
                "base_price": float(price_vnd),
                "avg_rating": 4.5
            })
            
        # Phân bổ kích thước / màu sắc biến thể theo danh mục con
        if cat_id.startswith("a3") or cat_id.startswith("b3"):  # Quần jean Nam/Nữ
            sizes = ["30", "31", "32"] if cat_id.startswith("a") else ["26", "27", "28"]
            colors = ["Xanh Indigo", "Đen Xám", "Xanh Nhạt"]
        elif cat_id.startswith("a") or cat_id.startswith("b"):   # Quần áo thun, sơ mi, váy đầm
            sizes = ["S", "M", "L", "XL"]
            colors = ["Trắng", "Đen", "Xanh Navy", "Kem Beige"]
        elif cat_id.startswith("c"):                            # Giày dép
            sizes = ["39", "40", "41", "42"] if cat_id == "c1000000-0000-0000-0000-000000000000" or cat_id == "c3000000-0000-0000-0000-000000000000" else ["37", "38", "39"]
            colors = ["Trắng", "Đen", "Nâu Da Bò"]
        else:                                                   # Phụ kiện
            sizes = ["Free Size"]
            colors = ["Đen", "Nâu Cổ Điển", "Be Sáng"]

        # Lấy tối đa 10 sản phẩm mỗi danh mục để chèn
        for idx, item in enumerate(final_prods[:10]):
            prod_uuid = str(uuid.uuid4())
            item_slug = item["slug"]
            
            prod_colors = colors[:3] if len(colors) >= 3 else colors
            prod_imgs = get_color_images(cat_id, prod_colors)
            
            products_to_insert.append({
                "id": prod_uuid,
                "category_id": cat_id,
                "name": item["name"],
                "slug": f"{item_slug}-{prod_counter}", # Đảm bảo slug độc nhất tuyệt đối
                "description": item["description"],
                "base_price": item["base_price"],
                "status": "active",
                "avg_rating": item["avg_rating"],
                "total_sold": 10 + idx * 24
            })
            
            for img_idx, img_url in enumerate(prod_imgs):
                images_to_insert.append({
                    "product_id": prod_uuid,
                    "image_url": img_url,
                    "is_primary": (img_idx == 0),
                    "display_order": img_idx + 1
                })
                
            variants_to_insert.append({
                "product_id": prod_uuid,
                "sku": f"SKU-{prod_counter:03d}-1",
                "attributes": {"size": sizes[0], "color": prod_colors[0]},
                "price": item["base_price"],
                "stock_quantity": 50
            })
            
            size_2 = sizes[1] if len(sizes) > 1 else sizes[0]
            color_2 = prod_colors[1] if len(prod_colors) > 1 else prod_colors[0]
            variants_to_insert.append({
                "product_id": prod_uuid,
                "sku": f"SKU-{prod_counter:03d}-2",
                "attributes": {"size": size_2, "color": color_2},
                "price": item["base_price"],
                "stock_quantity": 30
            })
            
            size_3 = sizes[2] if len(sizes) > 2 else sizes[0]
            color_3 = prod_colors[2] if len(prod_colors) > 2 else prod_colors[0]
            variants_to_insert.append({
                "product_id": prod_uuid,
                "sku": f"SKU-{prod_counter:03d}-3",
                "attributes": {"size": size_3, "color": color_3},
                "price": item["base_price"],
                "stock_quantity": 40
            })
            
            prod_counter += 1

    # 4. Thực thi insert hàng loạt (batch insert) qua Supabase Client
    if products_to_insert:
        print(f"-> Đang chèn {len(products_to_insert)} sản phẩm...")
        for k in range(0, len(products_to_insert), 50):
            supabase.table("products").insert(products_to_insert[k:k+50]).execute()
        print(f"  ✓ Đã nạp thành công {len(products_to_insert)} sản phẩm!")

        print(f"-> Đang chèn {len(images_to_insert)} hình ảnh sản phẩm...")
        for k in range(0, len(images_to_insert), 50):
            supabase.table("product_images").insert(images_to_insert[k:k+50]).execute()
        print("  ✓ Đã nạp hình ảnh!")

        print(f"-> Đang chèn {len(variants_to_insert)} biến thể sản phẩm...")
        for k in range(0, len(variants_to_insert), 50):
            supabase.table("product_variants").insert(variants_to_insert[k:k+50]).execute()
        print("  ✓ Đã nạp các biến thể!")
    else:
        print("⚠ Không tìm thấy sản phẩm nào từ API ngoài để nạp.")

    print("\n✅ HỆ THỐNG DỮ LIỆU ĐÃ ĐƯỢC THIẾT LẬP VÀ ĐỒNG BỘ THÀNH CÔNG TRÊN SUPABASE!")

    # Tự động xuất mã SQL chèn dữ liệu ra các file .sql để giữ đồng bộ
    try:
        sql_content = []
        sql_content.append("-- =====================================================================")
        sql_content.append("-- BẢN NẠP DỮ LIỆU MẪU (SEED DATA) THỜI TRANG VIỆT NAM CHO SHOFY")
        sql_content.append("-- Tự động sinh từ backend/seed.py")
        sql_content.append("-- =====================================================================\n")
        sql_content.append("TRUNCATE TABLE public.product_variants CASCADE;")
        sql_content.append("TRUNCATE TABLE public.product_images CASCADE;")
        sql_content.append("TRUNCATE TABLE public.products CASCADE;")
        sql_content.append("TRUNCATE TABLE public.categories CASCADE;\n")
        
        # 1. Danh mục cha
        sql_content.append("-- 1. DANH MỤC CHA")
        sql_content.append("INSERT INTO public.categories (id, name, slug, parent_id, image_url) VALUES")
        parent_values = []
        for p in parent_categories:
            img_val = f"'{p['image_url']}'" if p['image_url'] else "NULL"
            parent_values.append(f"('{p['id']}', '{p['name']}', '{p['slug']}', NULL, {img_val})")
        sql_content.append(",\n".join(parent_values) + ";\n")

        # 2. Danh mục con
        sql_content.append("-- 2. DANH MỤC CON")
        sql_content.append("INSERT INTO public.categories (id, name, slug, parent_id, image_url) VALUES")
        sub_values = []
        for s in sub_categories:
            img_val = f"'{s['image_url']}'" if s['image_url'] else "NULL"
            sub_values.append(f"('{s['id']}', '{s['name']}', '{s['slug']}', '{s['parent_id']}', {img_val})")
        sql_content.append(",\n".join(sub_values) + ";\n")

        # 3. Sản phẩm
        if products_to_insert:
            sql_content.append("-- 3. SẢN PHẨM")
            sql_content.append("INSERT INTO public.products (id, category_id, name, slug, description, base_price, status, avg_rating, total_sold) VALUES")
            prod_values = []
            for p in products_to_insert:
                desc_escaped = p['description'].replace("'", "''")
                name_escaped = p['name'].replace("'", "''")
                prod_values.append(f"('{p['id']}', '{p['category_id']}', '{name_escaped}', '{p['slug']}', '{desc_escaped}', {p['base_price']}, '{p['status']}', {p['avg_rating']}, {p['total_sold']})")
            sql_content.append(",\n".join(prod_values) + ";\n")

            # 4. Hình ảnh
            sql_content.append("-- 4. HÌNH ẢNH SẢN PHẨM")
            sql_content.append("INSERT INTO public.product_images (product_id, image_url, is_primary, display_order) VALUES")
            img_values = []
            for img in images_to_insert:
                img_values.append(f"('{img['product_id']}', '{img['image_url']}', {str(img['is_primary']).lower()}, {img['display_order']})")
            sql_content.append(",\n".join(img_values) + ";\n")

            # 5. Biến thể
            sql_content.append("-- 5. BIẾN THỂ SẢN PHẨM")
            sql_content.append("INSERT INTO public.product_variants (product_id, sku, attributes, price, stock_quantity) VALUES")
            var_values = []
            for var in variants_to_insert:
                attr_json = json.dumps(var['attributes'], ensure_ascii=False).replace("'", "''")
                var_values.append(f"('{var['product_id']}', '{var['sku']}', '{attr_json}'::jsonb, {var['price']}, {var['stock_quantity']})")
            sql_content.append(",\n".join(var_values) + ";\n")

        sql_text = "\n".join(sql_content)
        
        # Ghi đè vào các file SQL của project
        sql_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database_sql")
        os.makedirs(sql_dir, exist_ok=True)
        
        file1 = os.path.join(sql_dir, "02_supabase_seed.sql")
        file2 = os.path.join(sql_dir, "06_seeding_fashion_vn.sql")
        
        with open(file1, "w", encoding="utf-8") as f:
            f.write(sql_text)
        with open(file2, "w", encoding="utf-8") as f:
            f.write(sql_text)
            
        print("  ✓ Đã tự động cập nhật và đồng bộ hóa các file SQL seed: 02_supabase_seed.sql và 06_seeding_fashion_vn.sql!")
    except Exception as sql_err:
        print(f"Lưu ý: Không thể ghi file SQL: {sql_err}")

if __name__ == "__main__":
    seed_database()
