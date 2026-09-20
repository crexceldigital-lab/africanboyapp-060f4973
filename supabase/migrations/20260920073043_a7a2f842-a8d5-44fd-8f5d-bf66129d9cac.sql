CREATE OR REPLACE FUNCTION public.get_staff_store(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT store_id FROM public.store_staff WHERE user_id = _user_id LIMIT 1;
$$;