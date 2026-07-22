from pydantic import BaseModel, Field, conint
from typing import Optional

class ReviewCreateRequest(BaseModel):
    product_id: str
    rating: int = Field(..., ge=1, le=5, description="Đánh giá từ 1 đến 5 sao")
    comment: Optional[str] = None
