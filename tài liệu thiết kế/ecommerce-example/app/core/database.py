"""
core/database.py
-----------------
Setup SQLAlchemy async engine + session.
Mọi module (products, orders, cart...) đều dùng chung file này để lấy DB session,
KHÔNG tự tạo engine riêng.
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Engine: quản lý pool connection tới Postgres (Supabase)
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

# Session factory: mỗi request sẽ tạo 1 session mới từ đây
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class cho tất cả SQLAlchemy models (products, orders, users...)."""
    pass


async def get_db():
    """
    Dependency dùng trong FastAPI router: `db: AsyncSession = Depends(get_db)`.
    FastAPI tự động gọi hàm này cho mỗi request, đảm bảo session được đóng sau khi xong.
    """
    async with AsyncSessionLocal() as session:
        yield session
