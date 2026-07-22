"""
products/repository.py
-----------------------
TẦNG DATA ACCESS: chỉ làm việc với database (SELECT, INSERT, UPDATE, DELETE).
KHÔNG chứa business logic ở đây. Nếu sau này đổi ORM hoặc đổi sang gọi thẳng
Supabase client, chỉ cần sửa file này - các tầng trên (service, router) không đổi.
"""
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.products.models import Product, ProductVariant


class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_products(self, skip: int = 0, limit: int = 20) -> list[Product]:
        result = await self.db.execute(
            select(Product)
            .where(Product.status == "active")
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> Product | None:
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.variants), selectinload(Product.images))
            .where(Product.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        result = await self.db.execute(select(Product).where(Product.id == product_id))
        return result.scalar_one_or_none()

    async def create(self, product: Product) -> Product:
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def get_variant_by_id(self, variant_id: uuid.UUID) -> ProductVariant | None:
        result = await self.db.execute(select(ProductVariant).where(ProductVariant.id == variant_id))
        return result.scalar_one_or_none()
