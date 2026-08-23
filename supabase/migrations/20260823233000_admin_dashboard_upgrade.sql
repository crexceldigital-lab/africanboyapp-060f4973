-- Migration: Admin Dashboard Upgrade (RLS, Attributes Tables, Product Columns)

-- 1. RLS Policies for Orders & Profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can read all orders'
  ) THEN
    CREATE POLICY "Admins can read all orders" ON public.orders
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can update all orders'
  ) THEN
    CREATE POLICY "Admins can update all orders" ON public.orders
      FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can read all profiles'
  ) THEN
    CREATE POLICY "Admins can read all profiles" ON public.profiles
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 2. Attributes Tables (Categories, Subcategories, Sizes, Colors)
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'Anyone can read categories') THEN
    CREATE POLICY "Anyone can read categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'Admins can write categories') THEN
    CREATE POLICY "Admins can write categories" ON public.product_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_subcategories' AND policyname = 'Anyone can read subcategories') THEN
    CREATE POLICY "Anyone can read subcategories" ON public.product_subcategories FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_subcategories' AND policyname = 'Admins can write subcategories') THEN
    CREATE POLICY "Admins can write subcategories" ON public.product_subcategories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_sizes' AND policyname = 'Anyone can read sizes') THEN
    CREATE POLICY "Anyone can read sizes" ON public.product_sizes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_sizes' AND policyname = 'Admins can write sizes') THEN
    CREATE POLICY "Admins can write sizes" ON public.product_sizes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_colors' AND policyname = 'Anyone can read colors') THEN
    CREATE POLICY "Anyone can read colors" ON public.product_colors FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_colors' AND policyname = 'Admins can write colors') THEN
    CREATE POLICY "Admins can write colors" ON public.product_colors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 3. Enhance products table schema
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text;

-- 4. Seed initial default data for attributes if empty
INSERT INTO public.product_categories (name)
VALUES ('T-Shirt'), ('Hoods'), ('Jeans'), ('Accessories'), ('Footwear'), ('Tracksuit'), ('Caps')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.product_sizes (name, sort_order)
VALUES 
  ('XS', 1), ('S', 2), ('M', 3), ('L', 4), ('XL', 5), ('XXL', 6),
  ('28', 10), ('30', 11), ('32', 12), ('34', 13), ('36', 14), ('38', 15)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.product_colors (name, hex)
VALUES
  ('Black', '#1a1a1a'),
  ('White', '#f5f5f5'),
  ('Gold', '#c8a45c'),
  ('Navy', '#1b2a4a'),
  ('Burgundy', '#800020'),
  ('Olive', '#556b2f'),
  ('Grey', '#808080'),
  ('Red', '#dc2626')
ON CONFLICT (name) DO NOTHING;
