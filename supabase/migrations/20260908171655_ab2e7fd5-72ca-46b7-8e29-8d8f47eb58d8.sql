-- Storage policies were calling public.has_role(), whose EXECUTE was revoked from
-- authenticated (it is reserved for internal/service use). Switch to public.is_admin(),
-- the same helper used by the products/stores/gallery table policies.

DROP POLICY IF EXISTS "Admins can upload products images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update products images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete products images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload gallery" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete gallery" ON storage.objects;

CREATE POLICY "Admins can upload products images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins can update products images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'products' AND public.is_admin())
WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins can delete products images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Admins can upload gallery"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery' AND public.is_admin());

CREATE POLICY "Admins can update gallery"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery' AND public.is_admin())
WITH CHECK (bucket_id = 'gallery' AND public.is_admin());

CREATE POLICY "Admins can delete gallery"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery' AND public.is_admin());

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;