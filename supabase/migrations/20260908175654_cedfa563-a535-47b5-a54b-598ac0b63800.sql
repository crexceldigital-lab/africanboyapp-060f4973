ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS stock jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx ON public.products (sku) WHERE sku IS NOT NULL;