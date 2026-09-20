-- 1. Missing admin policies on orders and profiles (using is_admin(), executable by authenticated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Admins can read all orders') THEN
    CREATE POLICY "Admins can read all orders" ON public.orders FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Admins can update all orders') THEN
    CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Admins can delete orders') THEN
    CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Admins can read all profiles') THEN
    CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- 2. Product attribute tables
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.product_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);
CREATE TABLE IF NOT EXISTS public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  hex text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_categories' AND policyname='Anyone can read categories') THEN
    CREATE POLICY "Anyone can read categories" ON public.product_categories FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_categories' AND policyname='Admins can write categories') THEN
    CREATE POLICY "Admins can write categories" ON public.product_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_subcategories' AND policyname='Anyone can read subcategories') THEN
    CREATE POLICY "Anyone can read subcategories" ON public.product_subcategories FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_subcategories' AND policyname='Admins can write subcategories') THEN
    CREATE POLICY "Admins can write subcategories" ON public.product_subcategories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_sizes' AND policyname='Anyone can read sizes') THEN
    CREATE POLICY "Anyone can read sizes" ON public.product_sizes FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_sizes' AND policyname='Admins can write sizes') THEN
    CREATE POLICY "Admins can write sizes" ON public.product_sizes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_colors' AND policyname='Anyone can read colors') THEN
    CREATE POLICY "Anyone can read colors" ON public.product_colors FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_colors' AND policyname='Admins can write colors') THEN
    CREATE POLICY "Admins can write colors" ON public.product_colors FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

GRANT SELECT ON public.product_categories, public.product_subcategories, public.product_sizes, public.product_colors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories, public.product_subcategories, public.product_sizes, public.product_colors TO authenticated;
GRANT ALL ON public.product_categories, public.product_subcategories, public.product_sizes, public.product_colors TO service_role;

-- 3. Product columns (additive only)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 10;

-- 4. Attribute seed values
INSERT INTO public.product_categories (name)
VALUES ('T-Shirt'), ('Hoods'), ('Jeans'), ('Accessories'), ('Footwear'), ('Tracksuit'), ('Caps')
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.product_sizes (name, sort_order)
VALUES ('XS',1),('S',2),('M',3),('L',4),('XL',5),('XXL',6),('28',10),('30',11),('32',12),('34',13),('36',14),('38',15)
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.product_colors (name, hex)
VALUES ('Black','#1a1a1a'),('White','#f5f5f5'),('Gold','#c8a45c'),('Navy','#1b2a4a'),('Burgundy','#800020'),('Olive','#556b2f'),('Grey','#808080'),('Red','#dc2626')
ON CONFLICT (name) DO NOTHING;

-- 5. Product of the day
CREATE TABLE IF NOT EXISTS public.product_of_the_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  set_for_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_of_the_day ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_of_the_day' AND policyname='Anyone can read product of the day') THEN
    CREATE POLICY "Anyone can read product of the day" ON public.product_of_the_day FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_of_the_day' AND policyname='Admins can manage product of the day') THEN
    CREATE POLICY "Admins can manage product of the day" ON public.product_of_the_day FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
GRANT SELECT ON public.product_of_the_day TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_of_the_day TO authenticated;
GRANT ALL ON public.product_of_the_day TO service_role;