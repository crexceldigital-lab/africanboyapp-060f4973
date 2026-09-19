-- Migration: Add POS System Tables, Columns, Concurrency RPCs, and RLS Policies

-- 1. Extend public.orders with POS channel fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sale_type text NOT NULL DEFAULT 'online' CHECK (sale_type IN ('online', 'in_store')),
  ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_voided boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason text;

CREATE INDEX IF NOT EXISTS idx_orders_sale_type ON public.orders(sale_type);
CREATE INDEX IF NOT EXISTS idx_orders_receipt_number ON public.orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_orders_staff_user_id ON public.orders(staff_user_id);

-- 2. Create public.sale_payments table (supports split payments)
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL, -- 'cash', 'mpesa', 'airtel_money', 'mixx', 'halopesa', 'card', 'bank_transfer', 'other'
  amount numeric NOT NULL CHECK (amount >= 0),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_order_id ON public.sale_payments(order_id);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_payments' AND policyname = 'Anyone authenticated can read sale payments') THEN
    CREATE POLICY "Anyone authenticated can read sale payments" ON public.sale_payments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_payments' AND policyname = 'Authenticated staff can insert sale payments') THEN
    CREATE POLICY "Authenticated staff can insert sale payments" ON public.sale_payments FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- 3. Create public.inventory_movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id int REFERENCES public.stores(id) ON DELETE SET NULL,
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quantity int NOT NULL, -- negative for sale, positive for restock / void
  movement_type text NOT NULL CHECK (movement_type IN ('SALE', 'RESTOCK', 'ADJUSTMENT', 'VOID')),
  reference_id text, -- e.g. receipt_number or order_id
  previous_stock int NOT NULL,
  new_stock int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store ON public.inventory_movements(store_id);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'Anyone authenticated can read inventory movements') THEN
    CREATE POLICY "Anyone authenticated can read inventory movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'Authenticated staff can insert inventory movements') THEN
    CREATE POLICY "Authenticated staff can insert inventory movements" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- 4. Create public.held_sales table
CREATE TABLE IF NOT EXISTS public.held_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_number text NOT NULL,
  store_id int NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_data jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.held_sales ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'held_sales' AND policyname = 'Staff can manage store held sales') THEN
    CREATE POLICY "Staff can manage store held sales" ON public.held_sales FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 5. Create public.pos_audit_logs table
CREATE TABLE IF NOT EXISTS public.pos_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id int REFERENCES public.stores(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'SALE_COMPLETED', 'DISCOUNT_APPLIED', 'SALE_VOIDED', 'HOLD_SALE'
  reference text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pos_audit_logs' AND policyname = 'Admins can read audit logs') THEN
    CREATE POLICY "Admins can read audit logs" ON public.pos_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pos_audit_logs' AND policyname = 'Authenticated users can insert audit logs') THEN
    CREATE POLICY "Authenticated users can insert audit logs" ON public.pos_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- 6. Sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS pos_receipt_seq START WITH 100001;

-- 7. Atomic Concurrency Protection RPC Function: process_pos_sale
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
  v_item jsonb;
  v_payment jsonb;
  v_product_id uuid;
  v_qty int;
  v_current_stock int;
  v_prod_name text;
  v_primary_payment_method text := 'cash';
  v_primary_reference text := NULL;
BEGIN
  -- 1. Validate Store
  SELECT store_code, country_code INTO v_store_code, v_country_code
  FROM public.stores
  WHERE id = p_store_id;

  IF v_country_code IS NULL THEN
    RAISE EXCEPTION 'Invalid store ID: %', p_store_id;
  END IF;

  -- 2. Lock & Validate Product Stocks Concurrently
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item line in sale request';
    END IF;

    -- Row Lock on target product
    SELECT stock_quantity, name INTO v_current_stock, v_prod_name
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product with ID % not found', v_product_id;
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'Stock changed. Product "%" has only % units remaining.', v_prod_name, v_current_stock;
    END IF;
  END LOOP;

  -- 3. Deduct Stock & Record Inventory Movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    SELECT stock_quantity, name INTO v_current_stock, v_prod_name
    FROM public.products
    WHERE id = v_product_id;

    -- Update Master Product Stock
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_qty,
        updated_at = now()
    WHERE id = v_product_id;

    -- Update Store Availability Stock if tracked
    UPDATE public.product_store_availability
    SET stock_quantity = GREATEST(0, stock_quantity - v_qty)
    WHERE product_id = v_product_id AND store_id = p_store_id;

    -- Create Inventory Movement Entry
    INSERT INTO public.inventory_movements (
      product_id,
      store_id,
      staff_user_id,
      quantity,
      movement_type,
      reference_id,
      previous_stock,
      new_stock
    ) VALUES (
      v_product_id,
      p_store_id,
      p_staff_user_id,
      -v_qty,
      'SALE',
      NULL, -- Will update with receipt number
      v_current_stock,
      v_current_stock - v_qty
    );
  END LOOP;

  -- 4. Generate Unique Human-Readable Receipt Number
  v_receipt_number := 'AB-' || UPPER(COALESCE(v_store_code, v_country_code, 'TZ')) || '-' || LPAD(nextval('pos_receipt_seq')::text, 6, '0');

  -- Update movements reference_id
  UPDATE public.inventory_movements
  SET reference_id = v_receipt_number
  WHERE reference_id IS NULL AND staff_user_id = p_staff_user_id AND created_at >= (now() - interval '5 seconds');

  -- Extract primary payment method for main order record display
  IF jsonb_array_length(p_payments) > 0 THEN
    v_primary_payment_method := p_payments->0->>'payment_method';
    v_primary_reference := p_payments->0->>'reference';
  END IF;

  -- 5. Create Order Record
  INSERT INTO public.orders (
    user_id,
    store_id,
    staff_user_id,
    sale_type,
    status,
    total_amount,
    subtotal,
    discount_amount,
    discount_type,
    discount_value,
    approved_by,
    currency,
    items,
    customer_name,
    customer_email,
    customer_phone,
    payment_method,
    payment_reference,
    receipt_number,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_customer_id,
    p_store_id,
    p_staff_user_id,
    'in_store',
    'completed',
    p_total_amount,
    p_subtotal,
    p_discount_amount,
    p_discount_type,
    p_discount_value,
    p_approved_by,
    CASE WHEN v_country_code = 'NG' THEN 'NGN' ELSE 'TZS' END,
    p_items,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    v_primary_payment_method,
    v_primary_reference,
    v_receipt_number,
    p_notes,
    now(),
    now()
  )
  RETURNING id INTO v_order_id;

  -- 6. Insert Split Payment Records
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO public.sale_payments (
      order_id,
      payment_method,
      amount,
      reference
    ) VALUES (
      v_order_id,
      v_payment->>'payment_method',
      (v_payment->>'amount')::numeric,
      v_payment->>'reference'
    );
  END LOOP;

  -- 7. Audit Log
  INSERT INTO public.pos_audit_logs (
    user_id,
    store_id,
    action,
    reference,
    details
  ) VALUES (
    p_staff_user_id,
    p_store_id,
    'SALE_COMPLETED',
    v_receipt_number,
    jsonb_build_object(
      'order_id', v_order_id,
      'total_amount', p_total_amount,
      'discount_amount', p_discount_amount,
      'items_count', jsonb_array_length(p_items)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'receipt_number', v_receipt_number,
    'store_id', p_store_id,
    'total_amount', p_total_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_pos_sale TO authenticated;

-- 8. Atomic Void / Refund Function: void_pos_sale
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
  v_order record;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_current_stock int;
BEGIN
  -- 1. Fetch & Lock Order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.is_voided THEN
    RAISE EXCEPTION 'Sale is already voided';
  END IF;

  -- 2. Restore Stock & Record Movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    IF v_product_id IS NOT NULL AND v_qty > 0 THEN
      SELECT stock_quantity INTO v_current_stock
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;

      UPDATE public.products
      SET stock_quantity = stock_quantity + v_qty,
          updated_at = now()
      WHERE id = v_product_id;

      UPDATE public.product_store_availability
      SET stock_quantity = stock_quantity + v_qty
      WHERE product_id = v_product_id AND store_id = v_order.store_id;

      INSERT INTO public.inventory_movements (
        product_id,
        store_id,
        staff_user_id,
        quantity,
        movement_type,
        reference_id,
        previous_stock,
        new_stock
      ) VALUES (
        v_product_id,
        v_order.store_id,
        p_staff_user_id,
        v_qty,
        'VOID',
        v_order.receipt_number,
        v_current_stock,
        v_current_stock + v_qty
      );
    END IF;
  END LOOP;

  -- 3. Update Order Status
  UPDATE public.orders
  SET is_voided = true,
      status = 'cancelled',
      voided_at = now(),
      voided_by = p_staff_user_id,
      void_reason = p_reason,
      updated_at = now()
  WHERE id = p_order_id;

  -- 4. Log Audit
  INSERT INTO public.pos_audit_logs (
    user_id,
    store_id,
    action,
    reference,
    details
  ) VALUES (
    p_staff_user_id,
    v_order.store_id,
    'SALE_VOIDED',
    v_order.receipt_number,
    jsonb_build_object('order_id', p_order_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_pos_sale TO authenticated;
