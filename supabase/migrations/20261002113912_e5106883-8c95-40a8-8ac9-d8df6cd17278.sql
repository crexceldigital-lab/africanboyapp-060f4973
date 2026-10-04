CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_actor_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_status NOT IN ('pending', 'in_progress', 'completed', 'cancelled', 'refunded') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT (
    public.is_admin()
    OR (v_order.store_id IS NOT NULL AND public.is_store_manager_of(v_order.store_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  UPDATE public.orders
  SET status = p_status, updated_at = now()
  WHERE id = p_order_id;

  SELECT COALESCE(full_name, 'Staff member') INTO v_actor_name
  FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.order_activity (order_id, actor_id, actor_name, action, details)
  VALUES (p_order_id, auth.uid(), COALESCE(v_actor_name, 'Staff member'), 'status_changed',
          'Status changed from ' || v_order.status || ' to ' || p_status);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO authenticated;