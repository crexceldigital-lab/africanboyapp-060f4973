-- Migration: Add created_at to store_staff table
ALTER TABLE public.store_staff
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
