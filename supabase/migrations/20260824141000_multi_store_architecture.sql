-- Migration: Multi-Store Architecture (Tanzania + Nigeria)

-- 1. Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
  id serial PRIMARY KEY,
  name text NOT NULL,             -- 'AFRICAN BOY Tanzania', 'AFRICAN BOY Nigeria'
  country_code text NOT NULL UNIQUE,  -- 'TZ', 'NG'
  currency_code text NOT NULL,        -- 'TZS', 'NGN'
  is_active boolean NOT NULL DEFAULT true
);

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

INSERT INTO public.stores (name, country_code, currency_code) VALUES
  ('AFRICAN BOY Tanzania', 'TZ', 'TZS'),
  ('AFRICAN BOY Nigeria', 'NG', 'NGN')
ON CONFLICT (country_code) DO NOTHING;

-- 2. Product Store Availability Table
CREATE TABLE IF NOT EXISTS public.product_store_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id int NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT false,
  stock_quantity int NOT NULL DEFAULT 0,
  UNIQUE (product_id, store_id)
);

ALTER TABLE public.product_store_availability ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_store_availability' AND policyname = 'Anyone can read store availability') THEN
    CREATE POLICY "Anyone can read store availability" ON public.product_store_availability FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_store_availability' AND policyname = 'Admins can manage store availability') THEN
    CREATE POLICY "Admins can manage store availability" ON public.product_store_availability FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Trigger to sync products.stock_quantity as derived total
CREATE OR REPLACE FUNCTION public.sync_product_total_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = (
    SELECT COALESCE(SUM(stock_quantity), 0)
    FROM public.product_store_availability
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_total_stock ON public.product_store_availability;
CREATE TRIGGER trg_sync_product_total_stock
AFTER INSERT OR UPDATE OR DELETE ON public.product_store_availability
FOR EACH ROW EXECUTE FUNCTION public.sync_product_total_stock();

-- 3. Store Staff Table
CREATE TABLE IF NOT EXISTS public.store_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id int NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_role text NOT NULL DEFAULT 'sales_rep' CHECK (staff_role IN ('sales_rep', 'store_manager')),
  UNIQUE (user_id, store_id)
);

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

CREATE OR REPLACE FUNCTION public.get_staff_store(_user_id uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT store_id FROM public.store_staff WHERE user_id = _user_id LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_staff_store(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_store(uuid) TO authenticated;

-- 4. Orders Store Scoping
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id int REFERENCES public.stores(id);

-- Backfill existing orders by currency
UPDATE public.orders
SET store_id = (SELECT id FROM public.stores WHERE currency_code = orders.currency LIMIT 1)
WHERE store_id IS NULL;

-- Default fallback for any remaining orders with unmapped currency to Tanzania store (id = 1)
UPDATE public.orders
SET store_id = 1
WHERE store_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Store staff can read their store orders') THEN
    CREATE POLICY "Store staff can read their store orders" ON public.orders
      FOR SELECT TO authenticated
      USING (store_id = public.get_staff_store(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
