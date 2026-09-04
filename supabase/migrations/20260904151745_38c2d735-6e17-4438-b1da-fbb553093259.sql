CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can insert stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can update stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can delete stores" ON public.stores;

CREATE POLICY "Admins can insert stores" ON public.stores
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update stores" ON public.stores
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete stores" ON public.stores
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage store staff" ON public.store_staff;
CREATE POLICY "Admins manage store staff" ON public.store_staff
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Store staff can read their store orders" ON public.orders;
CREATE POLICY "Store staff can read their store orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR store_id IN (
      SELECT ss.store_id FROM public.store_staff ss
      WHERE ss.user_id = auth.uid() AND ss.status = 'active'
    )
  );