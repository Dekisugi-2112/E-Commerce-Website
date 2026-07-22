import os
import sys
import uuid
import random
import hashlib
from datetime import datetime, timedelta, timezone
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

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

# pool of 20 realistic Vietnamese names
VIETNAMESE_NAMES = [
    ("Nguyễn Văn Hùng", "hung.nguyen@gmail.com"),
    ("Trần Thị Lan", "lan.tran@gmail.com"),
    ("Lê Hoàng Nam", "nam.le@gmail.com"),
    ("Phạm Minh Tuấn", "tuan.pham@gmail.com"),
    ("Vũ Thu Trang", "trang.vu@gmail.com"),
    ("Hoàng Đức Anh", "ducanh.hoang@gmail.com"),
    ("Đặng Minh Ngọc", "ngoc.dang@gmail.com"),
    ("Ngô Quốc Bảo", "bao.ngo@gmail.com"),
    ("Bùi Phương Thảo", "thao.bui@gmail.com"),
    ("Đỗ Tuấn Kiệt", "kiet.do@gmail.com"),
    ("Phan Ngọc Vy", "vy.phan@gmail.com"),
    ("Tống Khánh Linh", "linh.tong@gmail.com"),
    ("Lý Minh Triết", "triet.ly@gmail.com"),
    ("Trịnh Gia Bảo", "giabao.trinh@gmail.com"),
    ("Mai Thu Hà", "ha.mai@gmail.com"),
    ("Vương Đình Phong", "phong.vuong@gmail.com"),
    ("Lương Bích Thủy", "thuy.luong@gmail.com"),
    ("Dương Anh Tuấn", "anhtuan.duong@gmail.com"),
    ("Hồ Mỹ Tâm", "mytam.ho@gmail.com"),
    ("Cao Thanh Sơn", "son.cao@gmail.com")
]

# Review templates based on category IDs
REVIEW_TEMPLATES = {
    # Áo thun (Nam/Nữ)
    "shirts_tshirts": {
        "pos": [
            "Áo thun chất vải cotton co giãn thoải mái, mặc rất mát tay, thấm hút tốt.",
            "Form áo rộng rãi, mặc lên rất thoải mái và cực kỳ trẻ trung.",
            "Chất vải mịn, giặt máy vài lần rồi vẫn không thấy bị xù lông hay phai màu.",
            "Đường may cẩn thận, không có chỉ thừa. Rất đáng tiền.",
            "Áo thun ôm vừa vặn cơ thể, màu sắc tươi tắn giống hệt hình mô tả.",
            "Chất vải co giãn thoải mái, thấm hút mồ hôi tốt. Rất phù hợp mặc mùa hè."
        ],
        "neu": [
            "Chất vải hơi mỏng hơn mình nghĩ nhưng với tầm giá này thì vẫn chấp nhận được.",
            "Áo mặc vừa vặn, cơ mà shop chuẩn bị hàng và giao hơi lâu xíu.",
            "Màu sắc bên ngoài hơi đậm hơn so với trên hình chụp một chút."
        ],
        "neg": [
            "Áo bị xù lông khá nhiều sau lần giặt đầu tiên. Hơi thất vọng.",
            "Chất vải pha nhiều nilon mặc khá nóng và bị bí mồ hôi khi vận động."
        ]
    },
    # Áo sơ mi & Áo kiểu
    "shirts_blouses": {
        "pos": [
            "Áo sơ mi vải đũi sờ mịn tay, ít nhăn sau khi giặt, mặc đi làm rất thanh lịch.",
            "Dáng áo ôm nhẹ tôn dáng rất đẹp, mặc đi làm hay đi chơi đều hợp lý.",
            "Đóng gói bọc rất cẩn thận, mở ra áo phẳng phiu sạch sẽ và thơm tho.",
            "Chất sơ mi Oxford dày dặn đứng dáng cực kỳ lịch lãm.",
            "Đường kim mũi chỉ rất đều và sắc nét, cúc áo đính chắc chắn.",
            "Phần cổ áo may cứng cáp, mặc lên đứng dáng và sang trọng."
        ],
        "neu": [
            "Áo mặc đẹp cơ mà chất vải hơi dễ nhăn, phải chịu khó ủi trước khi mặc.",
            "Size L hơi rộng so với mình một chút, chắc lần sau sẽ đặt size M.",
            "Chất vải bình thường, màu sắc giống hình chụp khoảng 90%."
        ],
        "neg": [
            "Cúc áo bị tuột chỉ ngay khi vừa nhận hàng, đường may ở nách áo bị lỗi chỉ.",
            "Chất vải thô ráp mặc bị ngứa cổ, không mềm mại như shop mô tả."
        ]
    },
    # Quần jean
    "jeans": {
        "pos": [
            "Quần jean co giãn tốt mặc không bị gò bó, di chuyển cực kỳ dễ chịu.",
            "Chất denim dày dặn chuẩn form, giặt không bị phai ra màu nhiều.",
            "Dáng slimfit mặc lên rất hack dáng và tôn chiều cao.",
            "Túi quần sâu rộng thoải mái đựng điện thoại to mà không lo bị rơi.",
            "Khóa kéo kim loại trơn tru bền bỉ, cúc quần đóng chắc chắn.",
            "Màu jean bụi bặm cá tính, phối đồ với áo thun cực kỳ hợp luôn."
        ],
        "neu": [
            "Quần denim rất đẹp nhưng ống hơi dài so với chiều cao mình, phải đi cắt gấu.",
            "Vải jean hơi cứng khi mới nhận, giặt qua một nước thì mặc mềm và thích hơn.",
            "Form quần hơi rộng ở bụng một chút, phải mang thắt lưng mới vừa."
        ],
        "neg": [
            "Màu sắc lệch nhiều so với ảnh quảng cáo, vải mỏng chứ không dày dặn.",
            "Khóa quần bị kẹt khó kéo, form quần mặc lên trông hơi kích mông."
        ]
    },
    # Áo khoác
    "jackets": {
        "pos": [
            "Áo khoác gió cản gió và chống nước nhẹ rất tốt, thích hợp mặc đi xe máy.",
            "Áo hoodie chất nỉ dày dặn ấm áp, lớp lót trong êm ái mịn màng.",
            "Form áo rộng rãi thoải mái phối đồ phong cách đường phố cực chất.",
            "Đường may khóa kéo chắc chắn, các túi áo đều có khóa bảo vệ rất an tâm.",
            "Mũ áo to rộng trùm đầu giữ ấm tai cực tốt cho mùa đông lạnh."
        ],
        "neu": [
            "Áo ấm nhưng hơi nặng, mặc đi lại cả ngày dài thấy hơi mỏi vai.",
            "Chất vải gió hơi kêu sột soạt khi cử động mạnh, còn lại đều tốt.",
            "Áo khoác form hơi to, mình mặc bị rộng tay nhưng lười đổi."
        ],
        "neg": [
            "Khóa kéo chính của áo khoác bị hỏng ngay khi vừa kéo thử lần đầu tiên.",
            "Lớp lót bên trong áo bị rách một đường dài ở phần nách áo khi nhận."
        ]
    },
    # Váy đầm
    "dresses": {
        "pos": [
            "Váy đầm voan mặc nhẹ nhàng bay bổng điệu đà lắm, rất phù hợp đi du lịch.",
            "Đầm ôm body tôn dáng quyến rũ, chất vải dày dặn co giãn thoải mái.",
            "Thiết kế hai dây xinh xắn, mặc đi tiệc cưới ai cũng khen đẹp.",
            "Chất vải voan tơ mềm mại thoáng mát, có lớp lót trong dày dặn kín đáo.",
            "Đầm xòe công chúa mặc xinh xắn dễ thương, tôn da lắm luôn."
        ],
        "neu": [
            "Váy đẹp cơ mà dây vai hơi dài, mình phải tự khâu bớt lại mới vừa.",
            "Vải đầm hơi mỏng dưới ánh nắng trực tiếp, cần lưu ý chọn nội y phù hợp.",
            "Giao hàng nhanh cơ mà đóng gói bị nhăn nhúm váy nhiều."
        ],
        "neg": [
            "Váy nhận được bị bẩn một vết ố vàng khá lớn ở phần trước chân váy.",
            "Đường may khóa giọt nước phía sau lưng bị lỗi nhăn nhúm trông mất thẩm mỹ."
        ]
    },
    # Giày dép
    "footwear": {
        "pos": [
            "Giày sneaker đi êm chân cực kỳ, đế cao su đàn hồi tốt chống trơn trượt.",
            "Boots da mềm mại ôm chân, gót chắc chắn đi vững vàng và hack dáng cực kỳ.",
            "Dép quai ngang đi nhẹ tênh thoải mái, chất nhựa dẻo cao cấp bền bỉ.",
            "Size giày chuẩn ôm khít bàn chân, đi bộ cả ngày không bị đau hay mỏi gót.",
            "Hộp giày đóng gói đẹp đẽ và vuông vức, shop phục vụ chu đáo, giao nhanh."
        ],
        "neu": [
            "Giày đẹp nhưng da hơi cứng lúc mới đi, đi được 3-4 ngày thì da mềm ra.",
            "Dép quai ngang size hơi nhỏ hơn bình thường một chút, mọi người nên tăng 1 size.",
            "Đế giày hơi cứng, cần lót thêm miếng đệm đi sẽ êm chân hơn."
        ],
        "neg": [
            "Đế giày bị bong keo nhẹ sau khi đi trúng trời mưa lớn lần đầu tiên.",
            "Shop giao sai size giày, mình đặt size 41 nhưng giao nhầm size 40."
        ]
    },
    # Phụ kiện
    "accessories": {
        "pos": [
            "Túi xách da PU mềm mại láng mịn, đường chỉ khâu đều tăm tắp rất tinh tế.",
            "Nón lưỡi trai chất kaki dày dặn, form nón cứng cáp chuẩn đẹp.",
            "Thắt lưng da bò thật cầm chắc tay, mặt khóa sáng bóng không bị xước.",
            "Túi xách nhiều ngăn tiện lợi đựng được cả ví tiền, son phấn và điện thoại.",
            "Phụ kiện xinh xắn giống hệt hình chụp, làm quà tặng cực kỳ lịch sự."
        ],
        "neu": [
            "Túi xách hơi nhỏ hơn so với tưởng tượng của mình một chút nhưng vẫn đủ dùng.",
            "Mặt khóa thắt lưng hơi chặt tay khi muốn mở ra để cắt ngắn bớt dây.",
            "Nón vải hơi mỏng nhưng đội che nắng đi học vẫn rất ổn."
        ],
        "neg": [
            "Dây đeo túi xách bị đứt chỉ một đoạn lớn ngay khi vừa treo đồ nặng vào.",
            "Mũ lưỡi trai bị móp méo form hoàn toàn do bên vận chuyển đè nặng lên."
        ]
    },
    # Fallback generic templates
    "generic": {
        "pos": [
            "Sản phẩm chất lượng tuyệt vời, đúng như mô tả của shop. Đóng gói rất cẩn thận.",
            "Giao hàng siêu nhanh, sản phẩm đẹp xuất sắc. Rất đáng đồng tiền bát gạo.",
            "Shop tư vấn nhiệt tình nhiệt tình, sản phẩm dùng rất ưng ý. Sẽ quay lại ủng hộ tiếp."
        ],
        "neu": [
            "Sản phẩm tạm ổn so với tầm giá, giao hàng bình thường.",
            "Chất lượng sản phẩm ở mức khá, đóng gói hơi đơn giản."
        ],
        "neg": [
            "Sản phẩm không giống mô tả lắm, chất lượng kém so với giá tiền.",
            "Chăm sóc khách hàng của shop phản hồi chậm, sản phẩm bị lỗi nhẹ."
        ]
    }
}

SUFFIXES = [
    "",
    " Sẽ ủng hộ shop dài dài.",
    " Rất đáng tiền mua nha mọi người.",
    " Đóng gói sản phẩm siêu cẩn thận luôn.",
    " Giao hàng siêu nhanh, shipper thân thiện.",
    " Đồ đẹp lắm, 5 sao!",
    " Ủng hộ shop nhiệt tình nha.",
    " Nhìn chung là rất hài lòng với dịch vụ.",
    " Khuyên mọi người nên mua thử."
]

def classify_templates(category_id: str) -> str:
    """
    Map category ID to templates key
    """
    cat = str(category_id)
    if cat.startswith("a1") or cat.startswith("b1"): # Áo thun
        return "shirts_tshirts"
    elif cat.startswith("a2") or cat.startswith("b4"): # Sơ mi, blouse
        return "shirts_blouses"
    elif cat.startswith("a3") or cat.startswith("b3"): # Quần jean
        return "jeans"
    elif cat.startswith("a4"): # Áo khoác
        return "jackets"
    elif cat.startswith("b2"): # Váy đầm
        return "dresses"
    elif cat.startswith("c"): # Giày dép
        return "footwear"
    elif cat.startswith("d"): # Phụ kiện
        return "accessories"
    return "generic"

def seed_reviews():
    print("=== BẮT ĐẦU SEED ĐÁNH GIÁ SẢN PHẨM (REVIEWS) PHONG PHÚ CHO AI ===")
    
    # 1. Lấy danh sách sản phẩm hiện có
    print("\n-> Đang lấy danh sách sản phẩm từ database...")
    products_res = supabase.table("products").select("id, category_id, name").execute()
    products = products_res.data
    if not products:
        print("  ⚠ Không tìm thấy sản phẩm nào trong database! Vui lòng nạp sản phẩm trước.")
        sys.exit(1)
    print(f"  ✓ Tìm thấy {len(products)} sản phẩm.")

    # 2. Lấy danh sách user profiles hiện có
    print("\n-> Đang lấy danh sách user từ database...")
    profiles_res = supabase.table("profiles").select("id, email, full_name").execute()
    profiles = profiles_res.data
    
    # Đảm bảo có ít nhất 25 profiles để đánh giá phong phú
    existing_emails = {p["email"] for p in profiles} if profiles else set()
    new_users = []
    pwd_hash = hash_password("123456")
    
    for name, email in VIETNAMESE_NAMES:
        if email not in existing_emails:
            user_uuid = str(uuid.uuid4())
            new_users.append({
                "id": user_uuid,
                "email": email,
                "password_hash": pwd_hash,
                "full_name": name,
                "phone": f"0912{random.randint(100000, 999999)}",
                "role": "customer",
                "avatar_url": f"https://api.dicebear.com/7.x/adventurer/svg?seed={email.split('@')[0]}"
            })
            
    if new_users:
        print(f"-> Đang thêm {len(new_users)} profile người dùng mới vào database...")
        for k in range(0, len(new_users), 10):
            supabase.table("profiles").insert(new_users[k:k+10]).execute()
        
        # Lấy lại toàn bộ profiles sau khi đã thêm mới
        profiles_res = supabase.table("profiles").select("id, email, full_name").execute()
        profiles = profiles_res.data
        
    print(f"  ✓ Đang có {len(profiles)} profiles người dùng làm reviewer.")

    # Dọn dẹp các review cũ trước khi nạp mới để tránh trùng lặp hoặc phình to dữ liệu không cần thiết
    print("\n-> Đang dọn dẹp các đánh giá cũ...")
    try:
        supabase.table("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("  ✓ Đã dọn dẹp xong!")
    except Exception as clean_err:
        print(f"  ⚠ Lỗi dọn dẹp review cũ: {clean_err}")

    # 3. Tạo dữ liệu reviews
    reviews_to_insert = []
    print("\n-> Đang tạo đánh giá cho từng sản phẩm...")
    
    # Phân phối xác suất cho Rating: 5 sao (65%), 4 sao (20%), 3 sao (10%), 2 sao (3%), 1 sao (2%)
    ratings_choices = [5, 4, 3, 2, 1]
    ratings_weights = [0.65, 0.20, 0.10, 0.03, 0.02]
    
    now = datetime.now(timezone.utc)
    
    for idx, p in enumerate(products):
        p_id = p["id"]
        cat_id = p["category_id"]
        cat_key = classify_templates(cat_id)
        templates = REVIEW_TEMPLATES[cat_key]
        
        # Mỗi sản phẩm có từ 4 đến 8 reviews ngẫu nhiên
        num_reviews = random.randint(4, 8)
        
        # Chọn ngẫu nhiên reviewer không trùng nhau trong cùng một sản phẩm
        reviewers = random.sample(profiles, min(num_reviews, len(profiles)))
        
        for reviewer in reviewers:
            rating = random.choices(ratings_choices, weights=ratings_weights)[0]
            
            # Chọn comment thích hợp theo rating
            if rating >= 4:
                comment_base = random.choice(templates["pos"])
            elif rating == 3:
                comment_base = random.choice(templates["neu"])
            else:
                comment_base = random.choice(templates["neg"])
                
            # Ghép thêm hậu tố ngẫu nhiên để câu từ thêm tự nhiên
            suffix = random.choice(SUFFIXES) if rating >= 4 else ""
            comment = f"{comment_base}{suffix}"
            
            # Tạo thời gian ngẫu nhiên trong vòng 90 ngày qua
            days_ago = random.randint(1, 90)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            created_at = now - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
            
            reviews_to_insert.append({
                "id": str(uuid.uuid4()),
                "product_id": p_id,
                "user_id": reviewer["id"],
                "rating": rating,
                "comment": comment,
                "created_at": created_at.isoformat()
            })
            
    # 4. Thực thi insert reviews hàng loạt (mỗi lô 50 bản ghi)
    print(f"-> Đang chèn {len(reviews_to_insert)} đánh giá vào database...")
    for k in range(0, len(reviews_to_insert), 50):
        batch = reviews_to_insert[k:k+50]
        supabase.table("reviews").insert(batch).execute()
        
    print("  ✓ Đã nạp thành công các đánh giá sản phẩm!")

    # 5. Cập nhật lại avg_rating của sản phẩm
    print("\n-> Đang tính toán và cập nhật lại điểm avg_rating cho tất cả sản phẩm...")
    # Lấy toàn bộ reviews để tính điểm trung bình cho hiệu năng cao nhất
    all_reviews_res = supabase.table("reviews").select("product_id, rating").execute()
    all_reviews = all_reviews_res.data
    
    product_ratings = {}
    for r in all_reviews:
        pid = r["product_id"]
        rating = r["rating"]
        if pid not in product_ratings:
            product_ratings[pid] = []
        product_ratings[pid].append(rating)
        
    updated_count = 0
    for pid, ratings in product_ratings.items():
        avg_score = round(sum(ratings) / len(ratings), 1)
        # Cập nhật database
        try:
            supabase.table("products").update({"avg_rating": avg_score}).eq("id", pid).execute()
            updated_count += 1
        except Exception as e:
            print(f"  ⚠ Lỗi cập nhật sản phẩm {pid}: {e}")
            
    print(f"  ✓ Đã cập nhật avg_rating cho {updated_count} sản phẩm.")

    # 6. Tạo file SQL lưu trữ
    print("\n-> Đang xuất câu lệnh SQL ra file seed...")
    try:
        sql_content = []
        sql_content.append("-- =====================================================================")
        sql_content.append("-- BẢN NẠP DỮ LIỆU ĐÁNH GIÁ SẢN PHẨM (REVIEWS SEED DATA) CHO SHOFY")
        sql_content.append("-- Tự động sinh từ backend/seed_reviews.py")
        sql_content.append("-- =====================================================================\n")
        
        sql_content.append("TRUNCATE TABLE public.reviews CASCADE;\n")
        
        # Thêm câu lệnh chèn profiles (nếu có profile mới)
        if new_users:
            sql_content.append("-- THÊM USER PROFILES MỚI")
            sql_content.append("INSERT INTO public.profiles (id, email, password_hash, full_name, phone, role, avatar_url) VALUES")
            prof_values = []
            for u in new_users:
                name_escaped = u['full_name'].replace("'", "''")
                prof_values.append(f"('{u['id']}', '{u['email']}', '{u['password_hash']}', '{name_escaped}', '{u['phone']}', '{u['role']}', '{u['avatar_url']}')")
            sql_content.append(",\n".join(prof_values) + ";\n")
            
        # Thêm reviews
        sql_content.append("-- THÊM REVIEWS")
        sql_content.append("INSERT INTO public.reviews (id, product_id, user_id, rating, comment, created_at) VALUES")
        rev_values = []
        for r in reviews_to_insert:
            comm_escaped = r['comment'].replace("'", "''")
            rev_values.append(f"('{r['id']}', '{r['product_id']}', '{r['user_id']}', {r['rating']}, '{comm_escaped}', '{r['created_at']}')")
        sql_content.append(",\n".join(rev_values) + ";\n")
        
        # Thêm câu lệnh cập nhật avg_rating sản phẩm
        sql_content.append("-- CẬP NHẬT AVG_RATING SẢN PHẨM")
        for pid, ratings in product_ratings.items():
            avg_score = round(sum(ratings) / len(ratings), 1)
            sql_content.append(f"UPDATE public.products SET avg_rating = {avg_score} WHERE id = '{pid}';")
            
        sql_text = "\n".join(sql_content)
        
        sql_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database_sql")
        os.makedirs(sql_dir, exist_ok=True)
        file_sql = os.path.join(sql_dir, "09_seeding_reviews.sql")
        
        with open(file_sql, "w", encoding="utf-8") as f:
            f.write(sql_text)
            
        print(f"  ✓ Đã ghi file SQL thành công tại {file_sql}!")
        
    except Exception as sql_err:
        print(f"Lưu ý: Không thể ghi file SQL: {sql_err}")

    print("\n✅ HOÀN TẤT SEED REVIEW THÀNH CÔNG!")
    print(f"Tổng số đánh giá đã chèn: {len(reviews_to_insert)}")

if __name__ == "__main__":
    seed_reviews()
