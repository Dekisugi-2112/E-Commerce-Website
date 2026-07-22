-- =====================================================================
-- SCRIPT TẠO BUCKET STORAGE VÀ CẤP QUYỀN TRÊN SUPABASE
-- Chạy script này trong Supabase SQL Editor trước khi chạy upload ảnh.
-- =====================================================================

-- 1. Tạo bucket 'products' (nếu chưa tồn tại)
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Cấp quyền đọc công khai cho mọi người
DROP POLICY IF EXISTS "Allow Public Select" ON storage.objects;
CREATE POLICY "Allow Public Select" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'products');

-- 3. Cấp quyền upload ảnh cho mọi người (bao gồm cả anon key)
DROP POLICY IF EXISTS "Allow Public Insert" ON storage.objects;
CREATE POLICY "Allow Public Insert" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'products');
