import threading
from supabase import create_client, Client
from app.core.config import settings

_thread_local = threading.local()

def get_supabase_client() -> Client:
    # Sử dụng thread-local storage để mỗi luồng trong threadpool có 1 Supabase client riêng biệt.
    # Điều này tránh xung đột chia sẻ socket trên Windows gây lỗi [WinError 10035] khi chạy đa luồng đồng thời.
    if not hasattr(_thread_local, "client") or _thread_local.client is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_KEY
        if not url or not key:
            raise ValueError(
                "SUPABASE_URL hoặc SUPABASE_KEY chưa được thiết lập trong file backend/.env! "
                "Vui lòng kiểm tra lại file backend/.env."
            )
        _thread_local.client = create_client(url, key)
    return _thread_local.client
