-- Migration: Inventory deduction ONLY on paid / completed orders with idempotency guard.

-- 1. Ensure inventory_deducted boolean column exists on public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS inventory_deducted boolean NOT NULL DEFAULT false;

-- 2. Backfill existing completed / paid / in_store orders or orders where stock was already deducted
UPDATE public.orders
SET inventory_deducted = true
WHERE stock_deducted_at IS NOT NULL 
   OR payment_status = 'paid' 
   OR status = 'completed' 
   OR sale_type = 'in_store';

-- 3. Central function to safely & atomically deduct order inventory exactly once
CREATE OR REPLACE FUNCTION public.deduct_order_inventory(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item jsonb;
  v_prod_id uuid;
  v_qty int;
  v_size text;
  v_color text;
  v_prev_stock int;
  v_product RECORD;
  v_stock_map jsonb;
  v_variant_key text;
BEGIN
  -- Lock order row FOR UPDATE
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- Idempotency check: if already deducted, exit immediately
  IF COALESCE(v_order.inventory_deducted, false) OR v_order.stock_deducted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_deducted', true, 'order_id', p_order_id);
  END IF;

  -- Loop through order items and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb))
  LOOP
    v_prod_id := NULLIF(COALESCE(v_item->>'product_id', v_item->>'id'), '')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    v_size := TRIM(COALESCE(v_item->>'size', v_item->>'selectedSize', ''));
    v_color := TRIM(COALESCE(v_item->>'color', v_item->>'selectedColor', ''));

    IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
      -- Lock store availability row FOR UPDATE
      SELECT stock_quantity INTO v_prev_stock 
      FROM public.product_store_availability
      WHERE product_id = v_prod_id AND store_id = COALESCE(v_order.store_id, 1) 
      FOR UPDATE;

      IF v_prev_stock IS NULL THEN
        INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
        VALUES (v_prod_id, COALESCE(v_order.store_id, 1), false, 0)
        ON CONFLICT (product_id, store_id) DO NOTHING;
        v_prev_stock := 0;
      END IF;

      -- Deduct store stock
      UPDATE public.product_store_availability
      SET stock_quantity = GREATEST(0, stock_quantity - v_qty),
          is_available = GREATEST(0, stock_quantity - v_qty) > 0
      WHERE product_id = v_prod_id AND store_id = COALESCE(v_order.store_id, 1);

      -- Deduct product variant stock in products.stock JSONB map if present
      SELECT * INTO v_product FROM public.products WHERE id = v_prod_id FOR UPDATE;
      IF FOUND AND v_product.stock IS NOT NULL AND jsonb_typeof(v_product.stock) = 'object' THEN
        v_stock_map := v_product.stock;
        v_variant_key := NULL;

        IF v_size <> '' AND v_stock_map ? v_size THEN
          v_variant_key := v_size;
        ELSIF v_color <> '' AND v_size <> '' AND v_stock_map ? (v_color || ' / ' || v_size) THEN
          v_variant_key := v_color || ' / ' || v_size;
        ELSIF v_color <> '' AND v_size <> '' AND v_stock_map ? (v_color || '-' || v_size) THEN
          v_variant_key := v_color || '-' || v_size;
        END IF;

        IF v_variant_key IS NOT NULL THEN
          v_stock_map := jsonb_set(
            v_stock_map,
            ARRAY[v_variant_key],
            to_jsonb(GREATEST(0, COALESCE((v_stock_map->>v_variant_key)::int, 0) - v_qty))
          );
          UPDATE public.products SET stock = v_stock_map WHERE id = v_prod_id;
        END IF;
      END IF;

      -- Log movement
      INSERT INTO public.inventory_movements (
        product_id, store_id, staff_user_id, quantity, movement_type, reference_id, previous_stock, new_stock
      ) VALUES (
        v_prod_id,
        COALESCE(v_order.store_id, 1),
        v_order.staff_user_id,
        -v_qty,
        'SALE',
        COALESCE(v_order.order_number, v_order.id::text),
        v_prev_stock,
        GREATEST(0, v_prev_stock - v_qty)
      );
    END IF;
  END LOOP;

  -- Mark order as inventory_deducted = true
  UPDATE public.orders
  SET inventory_deducted = true,
      stock_deducted_at = COALESCE(stock_deducted_at, now()),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'already_deducted', false, 'order_id', p_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.deduct_order_inventory(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.deduct_order_inventory(uuid) TO authenticated, service_role;

-- 4. Update confirm_order_payment function to call deduct_order_inventory
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id uuid,
  p_reference text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_method text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_deduct_res jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.payment_status = 'paid' AND COALESCE(v_order.inventory_deducted, false) THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'order_id', p_order_id);
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = CASE WHEN status IN ('pending','') OR status IS NULL THEN 'confirmed' ELSE status END,
      amount_paid = COALESCE(p_amount, total_amount),
      balance = GREATEST(0, total_amount - COALESCE(p_amount, total_amount)),
      payment_reference = COALESCE(p_reference, payment_reference),
      payment_method = COALESCE(p_method, payment_method),
      updated_at = now()
  WHERE id = p_order_id;

  -- Deduct inventory via safe, idempotent helper
  v_deduct_res := public.deduct_order_inventory(p_order_id);

  INSERT INTO public.order_activity (order_id, actor_name, action, details)
  VALUES (p_order_id, 'Payment Gateway', 'PAYMENT_CONFIRMED',
          'Payment confirmed' || COALESCE(' (ref ' || p_reference || ')', '') || '. Stock deducted.');

  RETURN jsonb_build_object('success', true, 'already_processed', false, 'order_id', p_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, numeric, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, numeric, text) TO service_role;

-- 5. Trigger function to auto-deduct inventory on status transition to completed or paid
CREATE OR REPLACE FUNCTION public.trg_auto_deduct_inventory_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.payment_status = 'paid' OR NEW.status = 'completed') 
     AND (COALESCE(NEW.inventory_deducted, false) IS NOT TRUE AND NEW.stock_deducted_at IS NULL) THEN
    PERFORM public.deduct_order_inventory(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_deduct_order_inventory ON public.orders;
CREATE TRIGGER trg_auto_deduct_order_inventory
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid' OR NEW.status = 'completed')
EXECUTE FUNCTION public.trg_auto_deduct_inventory_func();
