-- ============ 1. Order columns: POS channel, fulfillment, payment state ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sale_type text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS receipt_number text,
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
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_deducted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number) WHERE order_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_receipt_number_uniq ON public.orders(receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_sale_type ON public.orders(sale_type);
CREATE INDEX IF NOT EXISTS idx_orders_staff_user_id ON public.orders(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);

-- ============ 2. POS support tables ============
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_payments_order_id ON public.sale_payments(order_id);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id int REFERENCES public.stores(id) ON DELETE SET NULL,
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quantity int NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('SALE','RESTOCK','ADJUSTMENT','VOID')),
  reference_id text,
  previous_stock int NOT NULL,
  new_stock int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store ON public.inventory_movements(store_id);

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

CREATE TABLE IF NOT EXISTS public.pos_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id int REFERENCES public.stores(id) ON DELETE SET NULL,
  action text NOT NULL,
  reference text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.held_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments, public.inventory_movements, public.held_sales, public.pos_audit_logs TO authenticated;
GRANT ALL ON public.sale_payments, public.inventory_movements, public.held_sales, public.pos_audit_logs TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sale_payments' AND policyname='Admins and store staff read sale payments') THEN
    CREATE POLICY "Admins and store staff read sale payments" ON public.sale_payments FOR SELECT TO authenticated
      USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.orders o JOIN public.store_staff ss ON ss.store_id = o.store_id
        WHERE o.id = sale_payments.order_id AND ss.user_id = auth.uid() AND ss.status = 'active'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_movements' AND policyname='Admins and store staff read inventory movements') THEN
    CREATE POLICY "Admins and store staff read inventory movements" ON public.inventory_movements FOR SELECT TO authenticated
      USING (public.is_admin() OR store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='held_sales' AND policyname='Staff manage held sales for their store') THEN
    CREATE POLICY "Staff manage held sales for their store" ON public.held_sales FOR ALL TO authenticated
      USING (public.is_admin() OR store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'))
      WITH CHECK (public.is_admin() OR store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pos_audit_logs' AND policyname='Admins read audit logs') THEN
    CREATE POLICY "Admins read audit logs" ON public.pos_audit_logs FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- ============ 3. Fulfillment / tracking tables (no anonymous access; public tracking goes through an edge function) ============
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
CREATE TABLE IF NOT EXISTS public.order_shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.order_shipments(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text NOT NULL,
  quantity_shipped integer NOT NULL CHECK (quantity_shipped > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.order_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT 'System',
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_shipments_order ON public.order_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activity_order ON public.order_activity(order_id);

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_activity ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_shipments, public.order_shipment_items, public.order_activity TO authenticated;
GRANT ALL ON public.order_shipments, public.order_shipment_items, public.order_activity TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_shipments' AND policyname='Order owner admin or store staff read shipments') THEN
    CREATE POLICY "Order owner admin or store staff read shipments" ON public.order_shipments FOR SELECT TO authenticated
      USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_shipments.order_id AND (
          o.user_id = auth.uid()
          OR o.store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'))));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_shipment_items' AND policyname='Order owner admin or store staff read shipment items') THEN
    CREATE POLICY "Order owner admin or store staff read shipment items" ON public.order_shipment_items FOR SELECT TO authenticated
      USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.order_shipments s JOIN public.orders o ON o.id = s.order_id
        WHERE s.id = order_shipment_items.shipment_id AND (
          o.user_id = auth.uid()
          OR o.store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'))));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_activity' AND policyname='Order owner admin or store staff read activity') THEN
    CREATE POLICY "Order owner admin or store staff read activity" ON public.order_activity FOR SELECT TO authenticated
      USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_activity.order_id AND (
          o.user_id = auth.uid()
          OR o.store_id IN (SELECT ss.store_id FROM public.store_staff ss WHERE ss.user_id = auth.uid() AND ss.status = 'active'))));
  END IF;
END $$;

-- ============ 4. Sequences for human-readable numbers ============
CREATE SEQUENCE IF NOT EXISTS public.pos_receipt_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1;

-- Give any pre-existing order a real order number (fills blanks only)
UPDATE public.orders
SET order_number = 'AFB-' || to_char(COALESCE(created_at, now()), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0')
WHERE order_number IS NULL;