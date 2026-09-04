CREATE TABLE IF NOT EXISTS public.stores (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  country_code text NOT NULL DEFAULT 'TZ',
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stores_store_code_key ON public.stores (store_code) WHERE store_code IS NOT NULL;

GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.stores_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.stores_id_seq TO service_role;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='Anyone can read stores') THEN
    CREATE POLICY "Anyone can read stores" ON public.stores FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='Admins can insert stores') THEN
    CREATE POLICY "Admins can insert stores" ON public.stores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='Admins can update stores') THEN
    CREATE POLICY "Admins can update stores" ON public.stores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='Admins can delete stores') THEN
    CREATE POLICY "Admins can delete stores" ON public.stores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.stores (name, country, country_code, currency_code, location_name, store_code, city, status, is_active)
VALUES
  ('African Boy Tanzania', 'Tanzania', 'TZ', 'TZS', 'Sinza Africana Shop', 'TZ-001', 'Dar es Salaam', 'active', true),
  ('African Boy Nigeria', 'Nigeria', 'NG', 'NGN', 'Nigeria Operations', 'NG-001', NULL, 'active', true)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id int NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_role text NOT NULL DEFAULT 'sales_rep',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_staff TO authenticated;
GRANT ALL ON public.store_staff TO service_role;

ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_staff' AND policyname='Admins manage store staff') THEN
    CREATE POLICY "Admins manage store staff" ON public.store_staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_staff' AND policyname='Staff can read own assignment') THEN
    CREATE POLICY "Staff can read own assignment" ON public.store_staff FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_store_staff_updated_at ON public.store_staff;
CREATE TRIGGER update_store_staff_updated_at BEFORE UPDATE ON public.store_staff
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_staff_store(_user_id uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT store_id FROM public.store_staff WHERE user_id = _user_id AND status = 'active' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_staff_store(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_store(uuid) TO authenticated;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id int REFERENCES public.stores(id);

UPDATE public.orders o
SET store_id = (SELECT s.id FROM public.stores s WHERE s.currency_code = o.currency ORDER BY s.id LIMIT 1)
WHERE o.store_id IS NULL;

UPDATE public.orders
SET store_id = (SELECT id FROM public.stores WHERE country_code = 'TZ' ORDER BY id LIMIT 1)
WHERE store_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Store staff can read their store orders') THEN
    CREATE POLICY "Store staff can read their store orders" ON public.orders
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin') OR store_id = public.get_staff_store(auth.uid()));
  END IF;
END $$;