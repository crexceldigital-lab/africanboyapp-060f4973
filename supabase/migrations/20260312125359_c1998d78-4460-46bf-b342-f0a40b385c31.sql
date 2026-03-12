
-- Allow anyone (including unauthenticated) to read products
DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
CREATE POLICY "Anyone can read products" ON public.products FOR SELECT TO anon, authenticated USING (true);

-- Allow anyone to read gallery
DROP POLICY IF EXISTS "Anyone can read gallery" ON public.gallery_items;
CREATE POLICY "Anyone can read gallery" ON public.gallery_items FOR SELECT TO anon, authenticated USING (true);
