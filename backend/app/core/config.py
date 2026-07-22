import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Find and load .env file explicitly from backend directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Shofy Fashion E-Commerce API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "shofy-demo-secret-key-2026")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    class Config:
        case_sensitive = True
        extra = "ignore"

settings = Settings()

if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
    print(f"[WARNING] SUPABASE_URL or SUPABASE_KEY missing in env at path: {env_path}")
else:
    print(f"[INFO] Supabase config loaded successfully from: {env_path}")
