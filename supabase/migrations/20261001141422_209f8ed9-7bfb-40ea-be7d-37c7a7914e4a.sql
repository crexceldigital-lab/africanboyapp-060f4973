CREATE OR REPLACE FUNCTION public.is_active_store_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_staff WHERE user_id = auth.uid() AND staff_role = 'store_manager' AND status = 'active')
$$;
REVOKE EXECUTE ON FUNCTION public.is_active_store_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_store_manager() TO authenticated;

CREATE POLICY "Store managers view intl requests" ON public.international_order_requests
FOR SELECT TO authenticated USING (public.is_active_store_manager());
CREATE POLICY "Store managers update intl requests" ON public.international_order_requests
FOR UPDATE TO authenticated USING (public.is_active_store_manager()) WITH CHECK (public.is_active_store_manager());