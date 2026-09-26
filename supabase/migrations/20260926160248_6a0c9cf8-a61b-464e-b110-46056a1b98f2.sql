CREATE OR REPLACE FUNCTION public.get_inventory_actor_names(p_store_id integer)
RETURNS TABLE(user_id uuid, display_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT m.staff_user_id,
    COALESCE(NULLIF(btrim(p.full_name),''), CASE WHEN public.has_role(m.staff_user_id,'admin') THEN 'Admin' ELSE 'Staff member' END)
    || CASE WHEN public.has_role(m.staff_user_id,'admin') THEN ' (Admin)'
            WHEN ss.staff_role = 'store_manager' THEN ' (Store Manager)'
            WHEN ss.staff_role IS NOT NULL THEN ' (Sales Rep)' ELSE '' END
  FROM public.inventory_movements m
  LEFT JOIN public.profiles p ON p.id = m.staff_user_id
  LEFT JOIN public.store_staff ss ON ss.user_id = m.staff_user_id AND ss.store_id = p_store_id
  WHERE m.store_id = p_store_id AND m.staff_user_id IS NOT NULL
    AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.store_staff s WHERE s.user_id = auth.uid() AND s.store_id = p_store_id AND s.status = 'active'));
$$;
REVOKE ALL ON FUNCTION public.get_inventory_actor_names(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_actor_names(integer) TO authenticated;