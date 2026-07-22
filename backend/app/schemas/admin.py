from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CategoryAdminSchema(BaseModel):
    name: str
    slug: str
    image_url: Optional[str] = None

class ProductAdminSchema(BaseModel):
    name: str
    slug: str
    description: str
    base_price: float
    category_id: str
    status: str = "active"
    image_url: Optional[str] = None

class VariantAdminSchema(BaseModel):
    sku: str
    attributes: Dict[str, Any]
    price: float
    stock_quantity: int

class OrderStatusUpdateSchema(BaseModel):
    status: str = Field(..., description="pending, confirmed, shipping, delivered, cancelled")

class CouponAdminSchema(BaseModel):
    code: str
    discount_type: str = Field("percentage", description="percentage hoặc fixed")
    discount_value: float
    min_order_value: float = 0.0
    max_discount_amount: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    usage_limit: Optional[int] = None
    is_active: bool = True
