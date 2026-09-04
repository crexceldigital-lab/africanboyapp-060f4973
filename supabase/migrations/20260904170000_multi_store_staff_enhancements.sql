-- Migration: Multi-Store & Staff Assignment Enhancements (Tanzania + Nigeria + Scalable Stores)

-- 1. Ensure public.stores schema enhancements
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update country & status values for existing stores
UPDATE public.stores SET country = 'Tanzania', status = 'active' WHERE country_code = 'TZ';
UPDATE public.stores SET country = 'Nigeria', status = 'active' WHERE country_code = 'NG';

-- Ensure initial operational stores exist
INSERT INTO public.stores (name, country_code, currency_code, country, status) VALUES
  ('AFRICAN BOY Tanzania', 'TZ', 'TZS', 'Tanzania', 'active'),
  ('AFRICAN BOY Nigeria', 'NG', 'NGN', 'Nigeria', 'active')
ON CONFLICT (country_code) DO UPDATE SET
  country = EXCLUDED.country,
  status = EXCLUDED.status,
  updated_at = now();

-- RLS policies for stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can read stores') THEN
    CREATE POLICY "Anyone can read stores" ON public.stores FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Admins can manage stores') THEN
    CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 2. Ensure public.store_staff schema enhancements
ALTER TABLE public.store_staff
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update RLS policies for store_staff
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_staff' AND policyname = 'Admins manage store staff') THEN
    CREATE POLICY "Admins manage store staff" ON public.store_staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_staff' AND policyname = 'Staff can read own assignment') THEN
    CREATE POLICY "Staff can read own assignment" ON public.store_staff FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;
