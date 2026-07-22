from fastapi import APIRouter, HTTPException
import httpx
import json
from typing import Optional, List
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.schemas.ai import AIChatRequest

router = APIRouter(prefix="/ai", tags=["AI Stylist Integration"])

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

# Fallback advice rules in case Gemini API is offline/unavailable
FALLBACK_RULES = [
    {
        "keywords": ["cưới", "tiệc", "wedding", "party"],
        "advice": "Dành cho dịp tiệc cưới hoặc sự kiện trang trọng! Bạn nên phối Áo sơ mi dài tay phối cùng Quần âu dáng ôm lịch lãm. Bạn có thể khoác thêm blazer và đi giày tây để thêm phần sang trọng.",
        "category_slugs": ["ao-so-mi-nam", "quan-jean-nam"] # fallback categories
    },
    {
        "keywords": ["đi làm", "công sở", "work", "office"],
        "advice": "Phong cách công sở lịch sự và chuyên nghiệp! Bạn nên phối Áo sơ mi Oxford hoặc Polo tối màu với Quần tây dáng đứng để mang lại sự tự tin, chuyên nghiệp nhất.",
        "category_slugs": ["ao-so-mi-nam", "ao-thun-nam"]
    },
    {
        "keywords": ["hẹn hò", "date", "lãng mạn"],
        "advice": "Buổi hẹn hò lãng mạn cần sự tươm tất nhưng không quá cứng nhắc! Hãy phối Áo sơ mi cổ tàu phong cách Hàn Quốc cùng Quần Tây ống đứng, vừa nam tính lại vô cùng thanh lịch.",
        "category_slugs": ["ao-so-mi-nam", "quan-jean-nam"]
    },
    {
        "keywords": ["thể thao", "gym", "chạy", "sport"],
        "advice": "Trang phục thể thao đề cao sự co giãn và thoáng khí! Một chiếc Áo thun năng động co giãn phối quần short thể thao và giày sneaker ôm chân là sự lựa chọn hoàn hảo nhất.",
        "category_slugs": ["ao-thun-nam", "ao-thun-nu", "giay-sneaker"]
    },
    {
        "keywords": ["nam", "đồ nam", "men"],
        "advice": "Đối với các bạn nam, phong cách tối giản nhưng trẻ trung luôn cuốn hút nhất. Áo thun nam Polo kết hợp Quần Tây Slimfit đi cùng giày sneaker trắng là một set đồ quốc dân.",
        "category_slugs": ["ao-thun-nam", "quan-jean-nam"]
    },
    {
        "keywords": ["nữ", "đồ nữ", "women", "váy", "đầm"],
        "advice": "Đối với các bạn nữ, một chiếc váy đầm dáng xòe thướt tha đi kèm túi xách nhỏ xinh sẽ tôn dáng điệu đà, hoặc áo blouse kiểu phối quần jean năng động cho ngày thường nhật.",
        "category_slugs": ["vay-dam-nu", "ao-kieu-blouse-nu", "tui-xach"]
    }
]

DEFAULT_FALLBACK_ADVICE = "Chào bạn! Tôi là trợ lý thời trang AI Stylist của Shofy. Hãy thử hỏi tôi: 'Tư vấn cho mình một set đồ đi tiệc cưới lịch lãm' hoặc 'Phối đồ đi chơi mùa hè năng động cho nam' để bắt đầu tư vấn nhé!"

@router.post("/stylist")
async def ai_stylist_recommend(req: AIChatRequest):
    """
    Hỏi đáp tương tác đa lượt (Chatbot) với AI Stylist: Tư vấn phong cách dựa trên sản phẩm thực tế của cửa hàng
    """
    supabase = get_supabase_client()
    
    # 1. Lấy danh sách sản phẩm thực tế để gửi kèm vào System Instruction
    products_list = []
    try:
        res = supabase.table("products").select("id, name, base_price, categories(name)").eq("status", "active").execute()
        if res.data:
            products_list = res.data
    except Exception as e:
        print(f"Error fetching products for AI Stylist context: {e}")
        pass

    # Định dạng danh sách sản phẩm làm context
    products_context = ""
    for idx, p in enumerate(products_list):
        cat_name = p.get("categories", {}).get("name", "Thời trang")
        products_context += f"- ID: {p['id']}, Tên: {p['name']}, Giá: {p['base_price']} VND, Danh mục: {cat_name}\n"

    # 2. Xây dựng System Instruction cho Gemini
    system_instruction = f"""
Bạn là một Trợ lý Thời trang AI (AI Stylist) chuyên nghiệp của cửa hàng thời trang Shofy.
Nhiệm vụ của bạn là trò chuyện thân thiện, tư vấn phối đồ và giải đáp mọi thắc mắc về thời trang của khách hàng bằng tiếng Việt.

Dưới đây là danh sách sản phẩm thời trang đang có sẵn tại cửa hàng Shofy:
{products_context}

Hãy dựa vào lịch sử trò chuyện của khách hàng để trả lời câu hỏi mới nhất của họ.
Nếu trong câu trả lời bạn có nhắc đến hoặc gợi ý các sản phẩm cụ thể của Shofy, hãy điền ID của các sản phẩm đó vào danh sách `recommended_product_ids`. Nếu không gợi ý sản phẩm nào, hãy để danh sách này trống.
Hãy phản hồi dưới dạng JSON có cấu trúc chính xác sau:
{{
  "reply": "Nội dung câu trả lời/tư vấn của bạn bằng tiếng Việt...",
  "recommended_product_ids": ["ID_sản_phẩm_1", "ID_sản_phẩm_2"]
}}
Lưu ý: Không viết thêm bất kỳ chữ nào ngoài khối JSON này.
"""

    # 3. Định dạng lịch sử chat theo chuẩn Gemini REST API
    contents_payload = []
    for msg in req.messages:
        # Map roles: 'user' -> 'user', 'assistant'/'model' -> 'model'
        role = "user" if msg.role == "user" else "model"
        contents_payload.append({
            "role": role,
            "parts": [{"text": msg.content}]
        })

    # 4. Gọi Gemini API nếu có API key
    if settings.GEMINI_API_KEY:
        try:
            url = f"{GEMINI_API_URL}?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": contents_payload,
                "systemInstruction": {
                    "parts": [{"text": system_instruction}]
                }
            }
            async with httpx.AsyncClient() as client:
                api_res = await client.post(url, json=payload, timeout=15.0)
                if api_res.status_code == 200:
                    result = api_res.json()
                    text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                    
                    # Làm sạch chuỗi JSON trả về
                    if "```json" in text:
                        text = text.split("```json")[1].split("```")[0].strip()
                    elif "```" in text:
                        text = text.split("```")[1].split("```")[0].strip()
                    
                    parsed = json.loads(text)
                    rec_ids = parsed.get("recommended_product_ids", [])
                    
                    # Lấy thông tin chi tiết của các sản phẩm được gợi ý
                    rec_products = []
                    if rec_ids:
                        rec_products_res = supabase.table("products").select(
                            "*, categories(name), product_images(image_url, is_primary)"
                        ).in_("id", rec_ids).execute()
                        rec_products = rec_products_res.data or []

                    return {
                        "success": True,
                        "reply": parsed.get("reply", ""),
                        "products": rec_products,
                        "mode": "ai"
                    }
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            pass

    # 5. Fallback Rule-based Local (Đảm bảo đồ án luôn chạy tốt offline)
    # Tìm câu hỏi mới nhất của user để phân tích từ khóa
    last_user_query = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            last_user_query = msg.content.lower()
            break
            
    reply_text = DEFAULT_FALLBACK_ADVICE
    matched_slugs = []
    
    for rule in FALLBACK_RULES:
        if any(kw in last_user_query for kw in rule["keywords"]):
            reply_text = rule["advice"]
            matched_slugs = rule["category_slugs"]
            break
            
    # Lấy sản phẩm gợi ý dựa trên danh mục phù hợp hoặc ngẫu nhiên
    fallback_products = []
    try:
        if matched_slugs:
            # Lấy danh mục ID
            cat_res = supabase.table("categories").select("id").in_("slug", matched_slugs).execute()
            cat_ids = [c["id"] for c in cat_res.data] if cat_res.data else []
            if cat_ids:
                prod_res = supabase.table("products").select(
                    "*, categories(name), product_images(image_url, is_primary)"
                ).in_("category_id", cat_ids).limit(3).execute()
                fallback_products = prod_res.data or []
                
        if not fallback_products:
            # Lấy 2 sản phẩm bất kỳ nếu không khớp danh mục
            prod_res = supabase.table("products").select(
                "*, categories(name), product_images(image_url, is_primary)"
            ).limit(2).execute()
            fallback_products = prod_res.data or []
    except Exception as e:
        print(f"Error fetching fallback products: {e}")
        pass

    return {
        "success": True,
        "reply": reply_text,
        "products": fallback_products,
        "mode": "rule_fallback"
    }

@router.get("/recommend/{product_id}")
def get_product_recommendations(product_id: str):
    """
    Gợi ý 3 sản phẩm liên quan/phối hợp phù hợp (Ví dụ: áo sơ mi gợi ý kèm quần âu/giày tây)
    """
    supabase = get_supabase_client()
    try:
        # Lấy thông tin sản phẩm hiện tại để tìm sản phẩm cùng danh mục
        curr_prod_res = supabase.table("products").select("category_id").eq("id", product_id).execute()
        if not curr_prod_res.data:
            return {"success": True, "data": []}
        
        cat_id = curr_prod_res.data[0]["category_id"]

        # Lấy 3 sản phẩm ngẫu nhiên cùng danh mục loại trừ sản phẩm hiện tại
        res = supabase.table("products").select(
            "*, categories(name), product_images(image_url, is_primary)"
        ).eq("category_id", cat_id).neq("id", product_id).eq("status", "active").limit(3).execute()
        
        # Nếu cùng danh mục không đủ, lấy thêm sản phẩm khác
        data = res.data or []
        if len(data) < 3:
            more_res = supabase.table("products").select(
                "*, categories(name), product_images(image_url, is_primary)"
              ).neq("id", product_id).eq("status", "active").limit(3 - len(data)).execute()
            data.extend(more_res.data or [])

        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
