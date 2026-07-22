"""
core/config.py
---------------
Nơi DUY NHẤT đọc biến môi trường (.env) trong toàn bộ app.
Mọi module khác import `settings` từ đây thay vì tự đọc os.environ.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Connection string tới Supabase Postgres
    # Lấy trong Supabase Dashboard > Project Settings > Database > Connection string (URI)
    DATABASE_URL: str = "postgresql+asyncpg://user:password@host:5432/postgres"

    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""  # dùng cho các thao tác admin (upload storage...)

    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"


# Tạo 1 instance duy nhất, import instance này ở mọi nơi
settings = Settings()
