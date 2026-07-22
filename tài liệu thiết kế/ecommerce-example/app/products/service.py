"""
products/service.py
--------------------
TẦNG BUSINESS LOGIC: nơi xử lý "nghiệp vụ" thực sự.
Ví dụ: tự sinh slug từ tên sản phẩm, kiểm tra tồn kho, tính giá...
Router gọi Service, Service gọi Repository - Router KHÔNG được gọi thẳng Repository.
"""
import re
import uuid
from fastapi import HTTPException, status

from app.products.repository import ProductRepository
from app.products.models import Product, ProductVariant
from app.products.schemas import ProductCreate


def _slugify(text: str) -> str:
    """Chuyển 'Áo Thun Nam' -> 'ao-thun-nam' để dùng trong URL."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text


class ProductService:
    def __init__(self, repo: ProductRepository):
        self.repo = repo

    async def get_products(self, page: int = 1, page_size: int = 20):
        skip = (page - 1) * page_size
        return await self.repo.list_products(skip=skip, limit=page_size)

    async def get_product_detail(self, slug: str) -> Product:
        product = await self.repo.get_by_slug(slug)
        if not product:
            # Business rule: sản phẩm không tồn tại -> trả lỗi 404 rõ ràng
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sản phẩm")
        return product

    async def create_product(self, data: ProductCreate) -> Product:
        # Business rule: phải có ít nhất 1 variant để sản phẩm bán được
        if not data.variants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sản phẩm phải có ít nhất 1 biến thể (variant)",
            )

        product = Product(
            category_id=data.category_id,
            name=data.name,
            slug=_slugify(data.name),
            description=data.description,
            base_price=data.base_price,
        )
        product.variants = [
            ProductVariant(
                sku=v.sku,
                attributes=v.attributes,
                price=v.price,
                stock_quantity=v.stock_quantity,
            )
            for v in data.variants
        ]
        return await self.repo.create(product)

    async def check_stock_available(self, variant_id: uuid.UUID, quantity: int) -> bool:
        """
        Ví dụ business rule sẽ được orders/service.py gọi tới khi checkout:
        kiểm tra tồn kho trước khi cho phép đặt hàng.
        """
        variant = await self.repo.get_variant_by_id(variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail="Biến thể sản phẩm không tồn tại")
        return variant.stock_quantity >= quantity
