-- ============ Online checkout: authoritative prices, sequential order numbers, server-side delivery fee ============
CREATE OR REPLACE FUNCTION public.process_online_checkout(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_zone text DEFAULT 'inside_dar',
  p_delivery_fee numeric DEFAULT 0,
  p_discount_amount numeric DEFAULT 0,
  p_currency text DEFAULT 'TZS',
  p_is_guest boolean DEFAULT true,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_store_id int := 1;
  v_item jsonb;
  v_prod_id uuid;
  v_requested_qty int;
  v_db_product RECORD;
  v_db_price numeric;
  v_validated_items jsonb := '[]'::jsonb;
  v_server_subtotal numeric := 0;
  v_server_total numeric := 0;
  v_delivery_fee numeric := 0;
  v_discount numeric := 0;
BEGIN
  IF coalesce(trim(p_customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer full name is required for checkout.';
  END IF;
  IF coalesce(trim(p_customer_phone), '') = '' THEN
    RAISE EXCEPTION 'Customer phone number is required for checkout.';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty. Please select products to checkout.';
  END IF;

  SELECT id INTO v_store_id FROM public.stores WHERE currency_code = p_currency LIMIT 1;
  IF v_store_id IS NULL THEN
    v_store_id := 1;
  END IF;

  -- Delivery fee is decided by the server, never by the browser
  IF upper(coalesce(p_currency,'TZS')) = 'TZS' THEN
    v_delivery_fee := CASE lower(coalesce(p_delivery_zone,''))
      WHEN 'pickup' THEN 0
      WHEN 'inside_dar' THEN 3000
      ELSE 10000
    END;
  ELSE
    v_delivery_fee := GREATEST(0, COALESCE(p_delivery_fee, 0));
  END IF;

  v_discount := GREATEST(0, COALESCE(p_discount_amount, 0));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'id') IS NULL AND (v_item->>'product_id') IS NULL THEN
      RAISE EXCEPTION 'Invalid product reference in cart.';
    END IF;

    v_prod_id := COALESCE((v_item->>'id')::uuid, (v_item->>'product_id')::uuid);
    v_requested_qty := COALESCE((v_item->>'quantity')::int, 1);

    IF v_requested_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid product quantity % for product ID %', v_requested_qty, v_prod_id;
    END IF;

    SELECT * INTO v_db_product FROM public.products WHERE id = v_prod_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found in database.', v_prod_id;
    END IF;
    IF v_db_product.status = 'inactive' THEN
      RAISE EXCEPTION 'Product "%" is currently unavailable for purchase.', v_db_product.name;
    END IF;

    v_db_price := CASE
      WHEN COALESCE(v_db_product.on_sale, false) AND COALESCE(v_db_product.sale_price, 0) > 0
        THEN v_db_product.sale_price
      ELSE v_db_product.price
    END;

    IF COALESCE(v_db_product.stock_quantity, 0) < v_requested_qty THEN
      RAISE EXCEPTION 'Stock shortage for "%". Requested: %, Available: %',
        v_db_product.name, v_requested_qty, COALESCE(v_db_product.stock_quantity, 0);
    END IF;

    v_server_subtotal := v_server_subtotal + (v_db_price * v_requested_qty);

    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_db_product.id,
        'name', v_db_product.name,
        'price', v_db_price,
        'quantity', v_requested_qty,
        'line_total', v_db_price * v_requested_qty,
        'sku', v_db_product.sku,
        'size', COALESCE(v_item->>'selectedSize', v_item->>'size', ''),
        'color', COALESCE(v_item->>'selectedColor', v_item->>'color', ''),
        'quantity_shipped', 0,
        'image_url', COALESCE(v_db_product.image_url, '')
      )
    );
  END LOOP;

  v_server_total := GREATEST(0, v_server_subtotal + v_delivery_fee - v_discount);

  v_order_number := 'AFB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  INSERT INTO public.orders (
    order_number, user_id, store_id, sale_type, status, payment_status, amount_paid, balance,
    subtotal, delivery_fee, discount_amount, total_amount, currency,
    customer_name, customer_phone, customer_email, delivery_address, delivery_zone, is_guest, items
  ) VALUES (
    v_order_number, p_user_id, v_store_id, 'online', 'pending', 'unpaid', 0, v_server_total,
    v_server_subtotal, v_delivery_fee, v_discount, v_server_total, p_currency,
    p_customer_name, p_customer_phone, p_customer_email, p_delivery_address, p_delivery_zone, p_is_guest, v_validated_items
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_activity (order_id, actor_id, actor_name, action, details)
  VALUES (v_order_id, p_user_id, COALESCE(p_customer_name, 'Guest Customer'), 'ORDER_CREATED',
          'Online order ' || v_order_number || ' created. Total: ' || v_server_total::text || ' ' || p_currency);

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_server_subtotal,
    'delivery_fee', v_delivery_fee,
    'total_amount', v_server_total,
    'currency', p_currency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_online_checkout(text, text, text, text, text, numeric, numeric, text, boolean, jsonb, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_online_checkout(text, text, text, text, text, numeric, numeric, text, boolean, jsonb, uuid) TO service_role;

-- ============ Payment confirmation: idempotent, deducts stock exactly once ============
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
  v_item jsonb;
  v_prod_id uuid;
  v_qty int;
  v_prev int;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.payment_status = 'paid' THEN
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

  -- Deduct stock once and only once
  IF v_order.stock_deducted_at IS NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb))
    LOOP
      v_prod_id := NULLIF(COALESCE(v_item->>'product_id', v_item->>'id'), '')::uuid;
      v_qty := COALESCE((v_item->>'quantity')::int, 0);
      IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
        SELECT stock_quantity INTO v_prev FROM public.product_store_availability
        WHERE product_id = v_prod_id AND store_id = COALESCE(v_order.store_id, 1) FOR UPDATE;

        IF v_prev IS NULL THEN
          INSERT INTO public.product_store_availability (product_id, store_id, is_available, stock_quantity)
          VALUES (v_prod_id, COALESCE(v_order.store_id, 1), false, 0)
          ON CONFLICT (product_id, store_id) DO NOTHING;
          v_prev := 0;
        END IF;

        UPDATE public.product_store_availability
        SET stock_quantity = GREATEST(0, stock_quantity - v_qty),
            is_available = GREATEST(0, stock_quantity - v_qty) > 0
        WHERE product_id = v_prod_id AND store_id = COALESCE(v_order.store_id, 1);

        INSERT INTO public.inventory_movements (product_id, store_id, staff_user_id, quantity, movement_type, reference_id, previous_stock, new_stock)
        VALUES (v_prod_id, v_order.store_id, NULL, -v_qty, 'SALE', v_order.order_number, v_prev, GREATEST(0, v_prev - v_qty));
      END IF;
    END LOOP;

    UPDATE public.orders SET stock_deducted_at = now() WHERE id = p_order_id;
  END IF;

  INSERT INTO public.order_activity (order_id, actor_name, action, details)
  VALUES (p_order_id, 'Payment Gateway', 'PAYMENT_CONFIRMED',
          'Payment confirmed' || COALESCE(' (ref ' || p_reference || ')', '') || '. Stock deducted.');

  RETURN jsonb_build_object('success', true, 'already_processed', false, 'order_id', p_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, numeric, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, numeric, text) TO service_role;

-- ============ Payment failure / cancellation ============
CREATE OR REPLACE FUNCTION public.fail_order_payment(
  p_order_id uuid,
  p_status text DEFAULT 'failed',
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- Never downgrade an order that is already paid
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'ignored', true);
  END IF;

  UPDATE public.orders
  SET payment_status = CASE WHEN p_status = 'cancelled' THEN 'cancelled' ELSE 'failed' END,
      status = 'cancelled',
      payment_reference = COALESCE(p_reference, payment_reference),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_activity (order_id, actor_name, action, details)
  VALUES (p_order_id, 'Payment Gateway', 'PAYMENT_' || upper(p_status), 'Payment was not completed. No stock was deducted.');

  RETURN jsonb_build_object('success', true, 'ignored', false);
END;
$$;
REVOKE ALL ON FUNCTION public.fail_order_payment(uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_order_payment(uuid, text, text) TO service_role;