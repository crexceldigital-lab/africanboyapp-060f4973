ALTER TABLE public.product_store_availability ADD COLUMN IF NOT EXISTS variant_stock jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS variant_key text, ADD COLUMN IF NOT EXISTS reason text;

DROP POLICY IF EXISTS "Store staff manage their store availability" ON public.product_store_availability;

CREATE OR REPLACE FUNCTION public.is_store_manager_of(_store_id integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_staff
    WHERE user_id = auth.uid() AND store_id = _store_id AND status = 'active' AND staff_role = 'store_manager');
$$;

CREATE OR REPLACE FUNCTION public.adjust_store_inventory(
  p_product_id uuid, p_store_id integer, p_variant text, p_new_quantity integer,
  p_adjustment_type text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.product_store_availability%ROWTYPE;
  v_prev integer; v_diff integer; v_variant text := NULLIF(btrim(coalesce(p_variant,'')),'');
  v_global jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.is_admin() OR public.is_store_manager_of(p_store_id)) THEN
    RAISE EXCEPTION 'Not allowed to manage inventory for this store';
  END IF;
  IF p_new_quantity IS NULL OR p_new_quantity < 0 OR p_new_quantity > 1000000 THEN
    RAISE EXCEPTION 'Quantity must be between 0 and 1,000,000';
  END IF;
  IF p_adjustment_type NOT IN ('STOCK_RECEIVED','STOCK_ADJUSTMENT','DAMAGED','LOST','RETURNED','MANUAL_CORRECTION') THEN
    RAISE EXCEPTION 'Invalid adjustment type';
  END IF;
  IF coalesce(length(btrim(p_reason)),0) < 2 OR length(p_reason) > 500 THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN RAISE EXCEPTION 'Product not found'; END IF;

  INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
  VALUES (p_product_id, p_store_id, true, 0)
  ON CONFLICT DO NOTHING;
  SELECT * INTO v_row FROM public.product_store_availability
    WHERE product_id = p_product_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product is not assigned to this store'; END IF;

  IF v_variant IS NULL THEN
    v_prev := v_row.stock_quantity;
    v_diff := p_new_quantity - v_prev;
    UPDATE public.product_store_availability SET stock_quantity = p_new_quantity WHERE id = v_row.id;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND v_variant = ANY(sizes)) THEN
      RAISE EXCEPTION 'Unknown size for this product';
    END IF;
    v_prev := coalesce((v_row.variant_stock->>v_variant)::int, 0);
    v_diff := p_new_quantity - v_prev;
    UPDATE public.product_store_availability
      SET variant_stock = variant_stock || jsonb_build_object(v_variant, p_new_quantity),
          stock_quantity = GREATEST(stock_quantity + v_diff, 0)
      WHERE id = v_row.id;
    SELECT stock INTO v_global FROM public.products WHERE id = p_product_id;
    UPDATE public.products SET stock = coalesce(v_global,'{}'::jsonb) ||
      jsonb_build_object(v_variant, GREATEST(coalesce((v_global->>v_variant)::int,0) + v_diff, 0))
      WHERE id = p_product_id;
  END IF;

  INSERT INTO public.inventory_movements (product_id, store_id, staff_user_id, quantity, movement_type, reference_id, previous_stock, new_stock, variant_key, reason)
  VALUES (p_product_id, p_store_id, v_uid, v_diff, p_adjustment_type, NULL, v_prev, p_new_quantity, v_variant, btrim(p_reason));

  RETURN jsonb_build_object('previous', v_prev, 'new', p_new_quantity, 'difference', v_diff);
END; $$;

REVOKE ALL ON FUNCTION public.adjust_store_inventory(uuid,integer,text,integer,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_store_inventory(uuid,integer,text,integer,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.is_store_manager_of(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_manager_of(integer) TO authenticated;