-- Migration: Order Fulfillment & Public Tracking System

-- 1. Extend orders table with tracking, guest flag, and financial balance columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false;

-- Create unique index for order_number if not existing
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number) WHERE order_number IS NOT NULL;

-- 2. Create order_shipments table
CREATE TABLE IF NOT EXISTS public.order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier text NOT NULL,
  tracking_number text,
  status text NOT NULL DEFAULT 'shipped',
  shipped_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_shipments' AND policyname = 'Anyone can view order shipments') THEN
    CREATE POLICY "Anyone can view order shipments" ON public.order_shipments FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_shipments' AND policyname = 'Staff manage order shipments') THEN
    CREATE POLICY "Staff manage order shipments" ON public.order_shipments FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 3. Create order_shipment_items table
CREATE TABLE IF NOT EXISTS public.order_shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.order_shipments(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text NOT NULL,
  quantity_shipped integer NOT NULL CHECK (quantity_shipped > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_shipment_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_shipment_items' AND policyname = 'Anyone can view shipment items') THEN
    CREATE POLICY "Anyone can view shipment items" ON public.order_shipment_items FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_shipment_items' AND policyname = 'Staff manage shipment items') THEN
    CREATE POLICY "Staff manage shipment items" ON public.order_shipment_items FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 4. Create order_activity table
CREATE TABLE IF NOT EXISTS public.order_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT 'System',
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_activity ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_activity' AND policyname = 'Anyone can view order activity') THEN
    CREATE POLICY "Anyone can view order activity" ON public.order_activity FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_activity' AND policyname = 'Staff insert order activity') THEN
    CREATE POLICY "Staff insert order activity" ON public.order_activity FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 5. RPC Function: create_order_shipment
CREATE OR REPLACE FUNCTION public.create_order_shipment(
  p_order_id uuid,
  p_carrier text,
  p_tracking_number text,
  p_notes text,
  p_items jsonb,
  p_actor_name text DEFAULT 'Staff'
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
  v_all_shipped boolean := true;
BEGIN
  SELECT * INTO v_order_record FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found', p_order_id;
  END IF;

  INSERT INTO public.order_shipments (order_id, carrier, tracking_number, notes, created_by)
  VALUES (p_order_id, p_carrier, p_tracking_number, p_notes, auth.uid())
  RETURNING id INTO v_shipment_id;

  -- Process items array in order
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_order_record.items, '[]'::jsonb))
  LOOP
    v_item_name := v_item->>'name';
    v_prod_id := COALESCE(v_item->>'product_id', '');
    v_qty_ordered := COALESCE((v_item->>'quantity')::int, 1);
    v_qty_previously_shipped := COALESCE((v_item->>'quantity_shipped')::int, 0);
    v_ship_qty := 0;

    -- Look for matching item in p_items
    FOR v_ship_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      IF (v_ship_item->>'name' = v_item_name OR (v_prod_id <> '' AND v_ship_item->>'product_id' = v_prod_id)) THEN
        v_ship_qty := COALESCE((v_ship_item->>'quantity')::int, 0);
      END IF;
    END LOOP;

    v_new_shipped := v_qty_previously_shipped + v_ship_qty;
    IF v_new_shipped > v_qty_ordered THEN
      v_new_shipped := v_qty_ordered;
    END IF;

    IF v_ship_qty > 0 THEN
      INSERT INTO public.order_shipment_items (shipment_id, product_id, product_name, quantity_shipped)
      VALUES (
        v_shipment_id,
        CASE WHEN v_prod_id <> '' THEN v_prod_id::uuid ELSE NULL END,
        v_item_name,
        v_ship_qty
      );
    END IF;

    v_total_ordered := v_total_ordered + v_qty_ordered;
    v_total_shipped := v_total_shipped + v_new_shipped;

    v_updated_items := v_updated_items || jsonb_build_array(
      v_item || jsonb_build_object('quantity_shipped', v_new_shipped)
    );
  END LOOP;

  -- Update orders table with new items JSON and status
  UPDATE public.orders
  SET items = v_updated_items,
      status = CASE
        WHEN v_total_shipped >= v_total_ordered THEN 'completed'
        WHEN v_total_shipped > 0 THEN 'in_progress'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_order_id;

  -- Log Activity
  INSERT INTO public.order_activity (order_id, actor_id, actor_name, action, details)
  VALUES (
    p_order_id,
    auth.uid(),
    p_actor_name,
    'SHIPMENT_CREATED',
    'Created shipment via ' || p_carrier || ' (Tracking: ' || COALESCE(p_tracking_number, 'N/A') || ')'
  );

  RETURN v_shipment_id;
END;
$$;
