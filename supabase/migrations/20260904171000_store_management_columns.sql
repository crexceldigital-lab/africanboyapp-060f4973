-- Migration: Store Management Columns & Constraints Enhancement

-- 1. Add missing store columns to public.stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS store_code text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Drop strict unique constraint on country_code if it exists (so multiple branch locations per country are supported)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_country_code_key' AND conrelid = 'public.stores'::regclass
  ) THEN
    ALTER TABLE public.stores DROP CONSTRAINT stores_country_code_key;
  END IF;
END $$;

-- 3. Add unique constraint on store name if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_name_key' AND conrelid = 'public.stores'::regclass
  ) THEN
    ALTER TABLE public.stores ADD CONSTRAINT stores_name_key UNIQUE (name);
  END IF;
END $$;

-- 4. RLS Policy to ensure Admins can manage stores
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Admins can manage stores') THEN
    CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
