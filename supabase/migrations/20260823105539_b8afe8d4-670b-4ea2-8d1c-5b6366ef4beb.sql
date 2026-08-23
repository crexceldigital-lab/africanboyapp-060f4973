CREATE POLICY "Anyone can read products images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Admins can upload products images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));