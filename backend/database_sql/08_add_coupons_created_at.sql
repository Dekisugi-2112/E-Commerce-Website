-- SQL migration patch to add created_at column to coupons table
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
