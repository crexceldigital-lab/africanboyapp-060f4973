GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
DROP POLICY IF EXISTS "Public settings readable" ON public.app_settings;
CREATE POLICY "Public settings readable" ON public.app_settings FOR SELECT TO anon, authenticated USING (is_public);
CREATE POLICY "Admins read all settings" ON public.app_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));