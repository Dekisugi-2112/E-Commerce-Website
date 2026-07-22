"""
main.py
-------
Điểm khởi động app. Chỉ làm 1 việc: tạo FastAPI instance và "gắn" (include) các router
của từng module vào. Khi thêm module mới (orders, cart...) chỉ cần thêm 1 dòng ở đây.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.products.router import router as products_router
# from app.orders.router import router as orders_router     # sẽ thêm khi làm module orders
# from app.cart.router import router as cart_router          # sẽ thêm khi làm module cart

app = FastAPI(title="E-commerce API")

# Cho phép Next.js (chạy ở port khác) gọi API này trong lúc dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router)
# app.include_router(orders_router)
# app.include_router(cart_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
