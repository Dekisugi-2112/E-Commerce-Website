-- Run this in Supabase SQL Editor to update public.profiles table for direct DB Auth
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Drop RLS restrictions for profiles table so FastAPI backend can read and write profiles directly
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
