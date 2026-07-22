"""
products/schemas.py
--------------------
Pydantic models: định nghĩa HÌNH DẠNG dữ liệu ra/vào qua API.
Khác với models.py (cấu trúc bảng DB) - đây là "hợp đồng" giữa client và server.
"""
import uuid
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ---------- Schemas cho việc TẠO MỚI (input từ client) ----------

class ProductVariantCreate(BaseModel):
    sku: str
    attributes: dict = Field(default_factory=dict, examples=[{"size": "M", "color": "Đỏ"}])
    price: float
    stock_quantity: int = 0


class ProductCreate(BaseModel):
    category_id: uuid.UUID
    name: str
    description: Optional[str] = None
    base_price: float
    variants: list[ProductVariantCreate] = Field(default_factory=list)


# ---------- Schemas cho RESPONSE (output trả về client) ----------

class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # cho phép đọc trực tiếp từ SQLAlchemy object

    id: uuid.UUID
    sku: str
    attributes: dict
    price: float
    stock_quantity: int


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    base_price: float
    avg_rating: float
    total_sold: int
    variants: list[ProductVariantOut] = []


class ProductListOut(BaseModel):
    """Bản rút gọn dùng cho trang danh sách - không cần load hết variants."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    base_price: float
    avg_rating: float
