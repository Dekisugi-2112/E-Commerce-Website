from pydantic import BaseModel, Field
from typing import List, Optional

class OrderItemSchema(BaseModel):
    variant_id: str
    product_name: str
    variant_attributes: dict
    price: float
    quantity: int

class AddressSchema(BaseModel):
    recipient_name: str
    phone: str
    province: str
    district: str
    ward: str
    detail: str

class CheckoutRequest(BaseModel):
    address: AddressSchema
    payment_method: str = Field(..., description="cod hoặc vnpay")
    items: List[OrderItemSchema]
    coupon_code: Optional[str] = None
    discount_amount: float = 0.0
    shipping_fee: float = 0.0
    note: Optional[str] = None

class OrderResponse(BaseModel):
    success: bool
    message: str
    order_id: str
    redirect_url: Optional[str] = None
