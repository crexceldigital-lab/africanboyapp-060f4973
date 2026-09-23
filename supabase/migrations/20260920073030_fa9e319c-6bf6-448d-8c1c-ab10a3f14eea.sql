-- Countries & exchange rates
CREATE TABLE IF NOT EXISTS public.countries (
  id serial PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  currency_code text NOT NULL,
  currency_symbol text NOT NULL,
  flag_emoji text,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id serial PRIMARY KEY,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency)
);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='countries' AND policyname='Anyone can read countries') THEN
    CREATE POLICY "Anyone can read countries" ON public.countries FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='countries' AND policyname='Admins can manage countries') THEN
    CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exchange_rates' AND policyname='Anyone can read exchange rates') THEN
    CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rates FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exchange_rates' AND policyname='Admins can manage exchange rates') THEN
    CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
GRANT SELECT ON public.countries, public.exchange_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries, public.exchange_rates TO authenticated;
GRANT ALL ON public.countries, public.exchange_rates TO service_role;

INSERT INTO public.countries (name, code, currency_code, currency_symbol, flag_emoji) VALUES
  ('Tanzania','TZ','TZS','TSh','🇹🇿'),
  ('Nigeria','NG','NGN','₦','🇳🇬'),
  ('Kenya','KE','KES','KSh','🇰🇪'),
  ('Uganda','UG','UGX','USh','🇺🇬'),
  ('South Africa','ZA','ZAR','R','🇿🇦'),
  ('United States','US','USD','$','🇺🇸'),
  ('United Kingdom','GB','GBP','£','🇬🇧'),
  ('United Arab Emirates','AE','AED','AED','🇦🇪')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES
  ('TZS','TZS',1),('TZS','NGN',0.65),('TZS','KES',0.051),('TZS','UGX',1.45),
  ('TZS','ZAR',0.0071),('TZS','USD',0.00039),('TZS','GBP',0.00030),('TZS','AED',0.0014)
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- Per-store product availability (missing table that the shop and POS read)
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_store_availability' AND policyname='Anyone can read store availability') THEN
    CREATE POLICY "Anyone can read store availability" ON public.product_store_availability FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_store_availability' AND policyname='Admins can manage store availability') THEN
    CREATE POLICY "Admins can manage store availability" ON public.product_store_availability FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_store_availability' AND policyname='Store staff manage their store availability') THEN
    CREATE POLICY "Store staff manage their store availability" ON public.product_store_availability FOR UPDATE TO authenticated
      USING (store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'))
      WITH CHECK (store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'));
  END IF;
END $$;
GRANT SELECT ON public.product_store_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_store_availability TO authenticated;
GRANT ALL ON public.product_store_availability TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Keep products.stock_quantity as the derived total of per-store stock
CREATE OR REPLACE FUNCTION public.sync_product_total_stock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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

-- Staff store helper
CREATE OR REPLACE FUNCTION public.get_staff_store(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.store_staff WHERE user_id = _user_id LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_staff_store(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_store(uuid) TO authenticated, service_role;

-- Seed per-store availability from the current catalogue totals (store 1 keeps existing stock; totals unchanged)
INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
SELECT p.id, 1, COALESCE(p.stock_quantity,0) > 0, COALESCE(p.stock_quantity,0)
FROM public.products p
ON CONFLICT (product_id, store_id) DO NOTHING;
INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
SELECT p.id, s.id, false, 0
FROM public.products p CROSS JOIN public.stores s
WHERE s.id <> 1
ON CONFLICT (product_id, store_id) DO NOTHING;