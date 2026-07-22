"""
products/router.py
-------------------
TẦNG API: định nghĩa endpoints, nhận HTTP request, gọi Service, trả Response.
Router KHÔNG chứa business logic, KHÔNG gọi thẳng database.
Luồng: Router -> Service -> Repository -> Database
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.products.repository import ProductRepository
from app.products.service import ProductService
from app.products.schemas import ProductOut, ProductListOut, ProductCreate

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def get_product_service(db: AsyncSession = Depends(get_db)) -> ProductService:
    """
    Dependency injection: mỗi request tự tạo Repository + Service mới,
    dùng chung session DB của request đó.
    """
    repo = ProductRepository(db)
    return ProductService(repo)


@router.get("", response_model=list[ProductListOut])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: ProductService = Depends(get_product_service),
):
    """GET /api/v1/products?page=1&page_size=20"""
    return await service.get_products(page=page, page_size=page_size)


@router.get("/{slug}", response_model=ProductOut)
async def get_product_detail(
    slug: str,
    service: ProductService = Depends(get_product_service),
):
    """GET /api/v1/products/ao-thun-nam"""
    return await service.get_product_detail(slug)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    data: ProductCreate,
    service: ProductService = Depends(get_product_service),
    # TODO: thêm dependency kiểm tra admin, vd: current_user: dict = Depends(require_admin)
):
    """POST /api/v1/products - [Admin] Tạo sản phẩm mới"""
    return await service.create_product(data)
