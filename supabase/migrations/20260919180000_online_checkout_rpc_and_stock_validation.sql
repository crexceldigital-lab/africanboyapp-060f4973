-- Migration: Online Checkout RPC, Price Security, Atomic Stock Validation, & Realtime Order Publishing

-- 1. Create process_online_checkout RPC
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
  v_random_num int;
BEGIN
  -- 1. Input Validation
  IF coalesce(trim(p_customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer full name is required for checkout.';
  END IF;

  IF coalesce(trim(p_customer_phone), '') = '' THEN
    RAISE EXCEPTION 'Customer phone number is required for checkout.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty. Please select products to checkout.';
  END IF;

  -- Match store by currency
  SELECT id INTO v_store_id FROM public.stores WHERE currency_code = p_currency LIMIT 1;
  IF v_store_id IS NULL THEN
    v_store_id := 1;
  END IF;

  -- 2. Process Items, Fetch Authoritative DB Prices, & Atomically Check Stock
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

    -- Lock product row FOR UPDATE to prevent stock race condition
    SELECT * INTO v_db_product
    FROM public.products
    WHERE id = v_prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found in database.', v_prod_id;
    END IF;

    IF v_db_product.status = 'inactive' THEN
      RAISE EXCEPTION 'Product "%" is currently unavailable for purchase.', v_db_product.name;
    END IF;

    -- Price Security: Use authoritative DB price
    v_db_price := v_db_product.price;

    -- Atomic Stock Validation
    IF v_db_product.stock_quantity < v_requested_qty THEN
      RAISE EXCEPTION 'Stock shortage for "%". Requested: %, Available: %',
        v_db_product.name, v_requested_qty, v_db_product.stock_quantity;
    END IF;

    v_server_subtotal := v_server_subtotal + (v_db_price * v_requested_qty);

    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_db_product.id,
        'name', v_db_product.name,
        'price', v_db_price,
        'quantity', v_requested_qty,
        'sku', v_db_product.sku,
        'size', COALESCE(v_item->>'selectedSize', v_item->>'size', ''),
        'color', COALESCE(v_item->>'selectedColor', v_item->>'color', ''),
        'image_url', COALESCE(v_db_product.image_url, '')
      )
    );
  END LOOP;

  -- 3. Calculate Authoritative Total
  v_server_total := v_server_subtotal + COALESCE(p_delivery_fee, 0) - COALESCE(p_discount_amount, 0);
  IF v_server_total < 0 THEN
    v_server_total := 0;
  END IF;

  -- 4. Generate Order Number (AFB-2026-XXXXXX)
  v_random_num := floor(100000 + random() * 900000);
  v_order_number := 'AFB-' || to_char(now(), 'YYYY') || '-' || v_random_num::text;

  -- 5. Insert Order Record
  INSERT INTO public.orders (
    order_number,
    user_id,
    store_id,
    sale_type,
    status,
    payment_status,
    amount_paid,
    balance,
    subtotal,
    delivery_fee,
    discount_amount,
    total_amount,
    currency,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    delivery_zone,
    is_guest,
    items
  ) VALUES (
    v_order_number,
    p_user_id,
    v_store_id,
    'online',
    'pending',
    'unpaid',
    0,
    v_server_total,
    v_server_subtotal,
    p_delivery_fee,
    p_discount_amount,
    v_server_total,
    p_currency,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_delivery_address,
    p_delivery_zone,
    p_is_guest,
    v_validated_items
  )
  RETURNING id INTO v_order_id;

  -- 6. Log Initial Activity
  INSERT INTO public.order_activity (order_id, actor_id, actor_name, action, details)
  VALUES (
    v_order_id,
    p_user_id,
    COALESCE(p_customer_name, 'Guest Customer'),
    'ORDER_CREATED',
    'Online order #' || v_order_number || ' created. Total: ' || v_server_total::text || ' ' || p_currency
  );

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_server_total,
    'currency', p_currency
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_online_checkout(text, text, text, text, text, numeric, numeric, text, boolean, jsonb, uuid) TO anon, authenticated, service_role;

-- Enable Realtime publication for public.orders if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
