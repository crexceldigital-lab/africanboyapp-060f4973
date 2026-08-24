-- Migration: On Sale (10% Discount) + Product of the Day

-- 1. Add on_sale and discount_percent to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 10;

-- 2. Create product_of_the_day table
CREATE TABLE IF NOT EXISTS public.product_of_the_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  set_for_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_of_the_day ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_of_the_day' AND policyname = 'Anyone can read product of the day'
  ) THEN
    CREATE POLICY "Anyone can read product of the day" ON public.product_of_the_day
      FOR SELECT TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_of_the_day' AND policyname = 'Admins can manage product of the day'
  ) THEN
    CREATE POLICY "Admins can manage product of the day" ON public.product_of_the_day
      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
