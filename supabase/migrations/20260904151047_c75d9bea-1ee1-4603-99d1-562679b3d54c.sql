DROP POLICY IF EXISTS "Store staff can read their store orders" ON public.orders;

CREATE POLICY "Store staff can read their store orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR store_id IN (
      SELECT ss.store_id FROM public.store_staff ss
      WHERE ss.user_id = auth.uid() AND ss.status = 'active'
    )
  );

DROP FUNCTION IF EXISTS public.get_staff_store(uuid);