-- ============ In-store (POS) sale: atomic stock check, deduction, receipt, payments, audit ============
CREATE OR REPLACE FUNCTION public.process_pos_sale(
  p_store_id int,
  p_staff_user_id uuid,
  p_customer_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT 'Walk-in Customer',
  p_customer_phone text DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_subtotal numeric DEFAULT 0,
  p_discount_amount numeric DEFAULT 0,
  p_discount_type text DEFAULT 'none',
  p_discount_value numeric DEFAULT 0,
  p_approved_by uuid DEFAULT NULL,
  p_total_amount numeric DEFAULT 0,
  p_payments jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_code text;
  v_country_code text;
  v_receipt_number text;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_payment jsonb;
  v_product_id uuid;
  v_qty int;
  v_store_stock int;
  v_prod RECORD;
  v_db_price numeric;
  v_server_subtotal numeric := 0;
  v_server_total numeric := 0;
  v_discount numeric := 0;
  v_validated_items jsonb := '[]'::jsonb;
  v_primary_payment_method text := 'cash';
  v_primary_reference text := NULL;
  v_paid numeric := 0;
BEGIN
  SELECT store_code, country_code INTO v_store_code, v_country_code
  FROM public.stores WHERE id = p_store_id;
  IF v_country_code IS NULL THEN
    RAISE EXCEPTION 'Invalid store ID: %', p_store_id;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items in this sale.';
  END IF;

  -- Lock stock rows, validate availability and recompute prices from the database
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(COALESCE(v_item->>'product_id', v_item->>'id'), '')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 0);

    IF v_product_id IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item line in sale request';
    END IF;

    SELECT * INTO v_prod FROM public.products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found', v_product_id;
    END IF;

    SELECT stock_quantity INTO v_store_stock
    FROM public.product_store_availability
    WHERE product_id = v_product_id AND store_id = p_store_id
    FOR UPDATE;

    IF v_store_stock IS NULL THEN
      RAISE EXCEPTION 'Product "%" is not stocked at this store.', v_prod.name;
    END IF;
    IF v_store_stock < v_qty THEN
      RAISE EXCEPTION 'Stock changed. Product "%" has only % units remaining at this store.', v_prod.name, v_store_stock;
    END IF;

    v_db_price := CASE
      WHEN COALESCE(v_prod.on_sale, false) AND COALESCE(v_prod.sale_price, 0) > 0 THEN v_prod.sale_price
      ELSE v_prod.price
    END;
    v_server_subtotal := v_server_subtotal + (v_db_price * v_qty);

    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod.id,
        'name', v_prod.name,
        'sku', v_prod.sku,
        'price', v_db_price,
        'quantity', v_qty,
        'line_total', v_db_price * v_qty,
        'size', COALESCE(v_item->>'size', v_item->>'selectedSize', ''),
        'color', COALESCE(v_item->>'color', v_item->>'selectedColor', ''),
        'image_url', COALESCE(v_prod.image_url, '')
      )
    );
  END LOOP;

  v_discount := LEAST(GREATEST(0, COALESCE(p_discount_amount, 0)), v_server_subtotal);
  v_server_total := GREATEST(0, v_server_subtotal - v_discount);

  -- Deduct per-store stock (the product total is kept in sync automatically)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_validated_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    SELECT stock_quantity INTO v_store_stock
    FROM public.product_store_availability
    WHERE product_id = v_product_id AND store_id = p_store_id;

    UPDATE public.product_store_availability
    SET stock_quantity = GREATEST(0, stock_quantity - v_qty),
        is_available = GREATEST(0, stock_quantity - v_qty) > 0
    WHERE product_id = v_product_id AND store_id = p_store_id;

    INSERT INTO public.inventory_movements (
      product_id, store_id, staff_user_id, quantity, movement_type, reference_id, previous_stock, new_stock
    ) VALUES (
      v_product_id, p_store_id, p_staff_user_id, -v_qty, 'SALE', NULL, v_store_stock, GREATEST(0, v_store_stock - v_qty)
    );
  END LOOP;

  v_receipt_number := 'AB-' || UPPER(COALESCE(v_store_code, v_country_code, 'TZ')) || '-' || LPAD(nextval('public.pos_receipt_seq')::text, 6, '0');
  v_order_number := 'AFB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  UPDATE public.inventory_movements
  SET reference_id = v_receipt_number
  WHERE reference_id IS NULL AND staff_user_id = p_staff_user_id AND created_at >= (now() - interval '5 seconds');

  IF jsonb_array_length(p_payments) > 0 THEN
    v_primary_payment_method := p_payments->0->>'payment_method';
    v_primary_reference := p_payments->0->>'reference';
    SELECT COALESCE(SUM((p->>'amount')::numeric), 0) INTO v_paid FROM jsonb_array_elements(p_payments) p;
  END IF;

  INSERT INTO public.orders (
    order_number, user_id, store_id, staff_user_id, sale_type, status, payment_status,
    total_amount, subtotal, discount_amount, discount_type, discount_value, amount_paid, balance,
    approved_by, currency, items, customer_name, customer_email, customer_phone,
    payment_method, payment_reference, receipt_number, notes, stock_deducted_at, created_at, updated_at
  ) VALUES (
    v_order_number, p_customer_id, p_store_id, p_staff_user_id, 'in_store', 'completed', 'paid',
    v_server_total, v_server_subtotal, v_discount, p_discount_type, p_discount_value,
    GREATEST(v_paid, v_server_total), GREATEST(0, v_server_total - GREATEST(v_paid, v_server_total)),
    p_approved_by, CASE WHEN v_country_code = 'NG' THEN 'NGN' ELSE 'TZS' END,
    v_validated_items, p_customer_name, p_customer_email, p_customer_phone,
    v_primary_payment_method, v_primary_reference, v_receipt_number, p_notes, now(), now(), now()
  )
  RETURNING id INTO v_order_id;

  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO public.sale_payments (order_id, payment_method, amount, reference)
    VALUES (v_order_id, v_payment->>'payment_method', (v_payment->>'amount')::numeric, v_payment->>'reference');
  END LOOP;

  INSERT INTO public.pos_audit_logs (user_id, store_id, action, reference, details)
  VALUES (p_staff_user_id, p_store_id, 'SALE_COMPLETED', v_receipt_number,
    jsonb_build_object('order_id', v_order_id, 'total_amount', v_server_total, 'discount_amount', v_discount, 'items_count', jsonb_array_length(v_validated_items)));

  INSERT INTO public.order_activity (order_id, actor_id, actor_name, action, details)
  VALUES (v_order_id, p_staff_user_id, 'Store Staff', 'IN_STORE_SALE', 'In-store sale ' || v_receipt_number || ' completed.');

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_number', v_receipt_number,
    'store_id', p_store_id,
    'subtotal', v_server_subtotal,
    'discount_amount', v_discount,
    'total_amount', v_server_total
  );
END;
$$;
REVOKE ALL ON FUNCTION public.process_pos_sale(int, uuid, uuid, text, text, text, jsonb, numeric, numeric, text, numeric, uuid, numeric, jsonb, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_pos_sale(int, uuid, uuid, text, text, text, jsonb, numeric, numeric, text, numeric, uuid, numeric, jsonb, text) TO service_role;

-- ============ Void an in-store sale and restore stock ============
CREATE OR REPLACE FUNCTION public.void_pos_sale(
  p_order_id uuid,
  p_staff_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_prev int;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF COALESCE(v_order.is_voided, false) THEN
    RAISE EXCEPTION 'Sale is already voided';
  END IF;

  IF v_order.stock_deducted_at IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb))
    LOOP
      v_product_id := NULLIF(COALESCE(v_item->>'product_id', v_item->>'id'), '')::uuid;
      v_qty := COALESCE((v_item->>'quantity')::int, 0);
      IF v_product_id IS NOT NULL AND v_qty > 0 THEN
        SELECT stock_quantity INTO v_prev FROM public.product_store_availability
        WHERE product_id = v_product_id AND store_id = COALESCE(v_order.store_id, 1) FOR UPDATE;

        IF v_prev IS NOT NULL THEN
          UPDATE public.product_store_availability
          SET stock_quantity = stock_quantity + v_qty,
              is_available = true
          WHERE product_id = v_product_id AND store_id = COALESCE(v_order.store_id, 1);

          INSERT INTO public.inventory_movements (product_id, store_id, staff_user_id, quantity, movement_type, reference_id, previous_stock, new_stock)
          VALUES (v_product_id, v_order.store_id, p_staff_user_id, v_qty, 'VOID', COALESCE(v_order.receipt_number, v_order.order_number), v_prev, v_prev + v_qty);
        END IF;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET is_voided = true,
      status = 'cancelled',
      payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
      stock_deducted_at = NULL,
      voided_at = now(),
      voided_by = p_staff_user_id,
      void_reason = p_reason,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.pos_audit_logs (user_id, store_id, action, reference, details)
  VALUES (p_staff_user_id, v_order.store_id, 'SALE_VOIDED', COALESCE(v_order.receipt_number, v_order.order_number),
          jsonb_build_object('order_id', p_order_id, 'reason', p_reason));

  INSERT INTO public.order_activity (order_id, actor_id, actor_name, action, details)
  VALUES (p_order_id, p_staff_user_id, 'Store Staff', 'SALE_VOIDED', COALESCE(p_reason, 'Sale voided. Stock restored.'));

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.void_pos_sale(uuid, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_pos_sale(uuid, uuid, text) TO service_role;

-- ============ Shipments ============
CREATE OR REPLACE FUNCTION public.create_order_shipment(
  p_order_id uuid,
  p_carrier text,
  p_tracking_number text,
  p_notes text,
  p_items jsonb,
  p_actor_name text DEFAULT 'Staff',
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment_id uuid;
  v_order_record RECORD;
  v_updated_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_ship_item jsonb;
  v_item_name text;
  v_prod_id text;
  v_qty_ordered int;
  v_qty_previously_shipped int;
  v_ship_qty int;
  v_new_shipped int;
  v_total_ordered int := 0;
  v_total_shipped int := 0;
BEGIN
  SELECT * INTO v_order_record FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found', p_order_id;
  END IF;

  INSERT INTO public.order_shipments (order_id, carrier, tracking_number, notes, created_by)
  VALUES (p_order_id, p_carrier, p_tracking_number, p_notes, p_actor_id)
  RETURNING id INTO v_shipment_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order_record.items, '[]'::jsonb))
  LOOP
    v_item_name := v_item->>'name';
    v_prod_id := COALESCE(v_item->>'product_id', '');
    v_qty_ordered := COALESCE((v_item->>'quantity')::int, 1);
    v_qty_previously_shipped := COALESCE((v_item->>'quantity_shipped')::int, 0);
    v_ship_qty := 0;

    FOR v_ship_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      IF (v_ship_item->>'name' = v_item_name OR (v_prod_id <> '' AND v_ship_item->>'product_id' = v_prod_id)) THEN
        v_ship_qty := COALESCE((v_ship_item->>'quantity')::int, 0);
      END IF;
    END LOOP;

    -- Never ship more than remains
    v_ship_qty := LEAST(v_ship_qty, GREATEST(0, v_qty_ordered - v_qty_previously_shipped));
    v_new_shipped := v_qty_previously_shipped + v_ship_qty;

    IF v_ship_qty > 0 THEN
      INSERT INTO public.order_shipment_items (shipment_id, product_id, product_name, quantity_shipped)
      VALUES (v_shipment_id, CASE WHEN v_prod_id <> '' THEN v_prod_id::uuid ELSE NULL END, v_item_name, v_ship_qty);
    END IF;

    v_total_ordered := v_total_ordered + v_qty_ordered;
    v_total_shipped := v_total_shipped + v_new_shipped;

    v_updated_items := v_updated_items || jsonb_build_array(
      v_item || jsonb_build_object('quantity_shipped', v_new_shipped)
    );
  END LOOP;

  UPDATE public.orders
  SET items = v_updated_items,
      status = CASE
        WHEN v_total_shipped >= v_total_ordered THEN 'shipped'
        WHEN v_total_shipped > 0 THEN 'processing'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_activity (order_id, actor_id, actor_name, action, details)
  VALUES (p_order_id, p_actor_id, p_actor_name, 'SHIPMENT_CREATED',
          'Created shipment via ' || p_carrier || ' (Tracking: ' || COALESCE(p_tracking_number, 'N/A') || ')');

  RETURN v_shipment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_shipment(uuid, text, text, text, jsonb, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_shipment(uuid, text, text, text, jsonb, text, uuid) TO service_role;