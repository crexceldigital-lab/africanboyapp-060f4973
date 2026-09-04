-- Migration: Ensure public.stores & public.store_staff tables, policies, and initial operational data

-- 1. Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  country_code text NOT NULL,
  currency_code text NOT NULL DEFAULT 'TZS',
  country text NOT NULL DEFAULT 'Tanzania',
  location_name text,
  store_code text,
  address text,
  city text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Stores RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can read stores') THEN
    CREATE POLICY "Anyone can read stores" ON public.stores FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Admins can manage stores') THEN
    CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Seed Initial Operational Stores (African Boy Tanzania & African Boy Nigeria)
INSERT INTO public.stores (name, country, country_code, currency_code, location_name, store_code, city, status, is_active) VALUES
  ('African Boy Tanzania', 'Tanzania', 'TZ', 'TZS', 'Sinza Africana Shop', 'TZ-001', 'Dar es Salaam', 'active', true),
  ('African Boy Nigeria', 'Nigeria', 'NG', 'NGN', 'Nigeria Operations', 'NG-001', 'Lagos', 'active', true)
ON CONFLICT (name) DO UPDATE SET
  country = EXCLUDED.country,
  country_code = EXCLUDED.country_code,
  currency_code = EXCLUDED.currency_code,
  location_name = COALESCE(EXCLUDED.location_name, public.stores.location_name),
  store_code = COALESCE(EXCLUDED.store_code, public.stores.store_code),
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 2. Create store_staff table
CREATE TABLE IF NOT EXISTS public.store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id int NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_role text NOT NULL DEFAULT 'sales_rep',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, store_id)
);

ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;

-- Store Staff RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_staff' AND policyname = 'Admins manage store staff') THEN
    CREATE POLICY "Admins manage store staff" ON public.store_staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_staff' AND policyname = 'Staff can read own assignment') THEN
    CREATE POLICY "Staff can read own assignment" ON public.store_staff FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. Store scoping helper for orders
CREATE OR REPLACE FUNCTION public.get_staff_store(_user_id uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT store_id FROM public.store_staff WHERE user_id = _user_id AND status = 'active' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_staff_store(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_store(uuid) TO authenticated;
