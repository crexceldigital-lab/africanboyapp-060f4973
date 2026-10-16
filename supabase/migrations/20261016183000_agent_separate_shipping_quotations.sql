-- ==============================================================================
-- AFRICAN BOY: SEPARATE PRODUCT SALES & AGENT SHIPPING QUOTATIONS
-- ==============================================================================
-- Separates merchandise sales from shipping arrangements for the African Boy
-- Agent Portal. Agents can purchase products with 0 shipping on product invoices,
-- and request separate shipping quotations from Tanzania or China.
-- Authorised staff verify courier quotes and agents approve shipping costs separately.

-- 1. Ensure available_origins column on products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'available_origins'
  ) THEN
    ALTER TABLE public.products ADD COLUMN available_origins text[] NOT NULL DEFAULT '{Tanzania,China}';
  END IF;
END $$;

-- 2. Create agent_shipping_quotes table
CREATE TABLE IF NOT EXISTS public.agent_shipping_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.agent_replenishment_orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipping_origin text NOT NULL CHECK (shipping_origin IN ('Tanzania', 'China')),
  destination_country text NOT NULL,
  destination_city text NOT NULL,
  destination_postcode text,
  delivery_address text NOT NULL,
  special_requirements text,
  
  -- Verified Quotation Details (completed by staff)
  courier_name text,
  shipping_amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  customs_and_handling_fee numeric NOT NULL DEFAULT 0.00,
  estimated_delivery_time text,
  quote_date date,
  expiry_date date,
  is_verified boolean NOT NULL DEFAULT false,
  
  -- Workflow Status
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'accepted', 'rejected', 'expired', 'dispatched', 'delivered')
  ),
  agent_rejection_reason text,
  revision_number integer NOT NULL DEFAULT 1,
  
  -- Separate Shipping Payment
  shipping_payment_status text NOT NULL DEFAULT 'unpaid' CHECK (
    shipping_payment_status IN ('unpaid', 'pending', 'paid')
  ),
  shipping_payment_reference text,
  shipping_payment_date timestamptz,
  
  -- Dispatch & Tracking
  tracking_number text,
  tracking_url text,
  dispatched_at timestamptz,
  estimated_delivery_date date,
  delivered_at timestamptz,
  
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_agent_shipping_quotes_order ON public.agent_shipping_quotes(order_id);
CREATE INDEX IF NOT EXISTS idx_agent_shipping_quotes_agent ON public.agent_shipping_quotes(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_shipping_quotes_user ON public.agent_shipping_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_shipping_quotes_status ON public.agent_shipping_quotes(status);

-- 3. Create agent_shipping_audit_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.agent_shipping_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.agent_shipping_quotes(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_audit_quote ON public.agent_shipping_audit_logs(quote_id);

-- 4. Row Level Security for agent_shipping_quotes
ALTER TABLE public.agent_shipping_quotes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.agent_shipping_quotes TO authenticated;
GRANT ALL ON public.agent_shipping_quotes TO service_role;

DROP POLICY IF EXISTS "Admins manage all shipping quotes" ON public.agent_shipping_quotes;
CREATE POLICY "Admins manage all shipping quotes"
  ON public.agent_shipping_quotes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Agents view own shipping quotes" ON public.agent_shipping_quotes;
CREATE POLICY "Agents view own shipping quotes"
  ON public.agent_shipping_quotes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Agents request shipping quotes for own orders" ON public.agent_shipping_quotes;
CREATE POLICY "Agents request shipping quotes for own orders"
  ON public.agent_shipping_quotes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Agents respond to own shipping quotes" ON public.agent_shipping_quotes;
CREATE POLICY "Agents respond to own shipping quotes"
  ON public.agent_shipping_quotes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Row Level Security for agent_shipping_audit_logs
ALTER TABLE public.agent_shipping_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.agent_shipping_audit_logs TO authenticated;
GRANT ALL ON public.agent_shipping_audit_logs TO service_role;

DROP POLICY IF EXISTS "Admins manage all shipping audit logs" ON public.agent_shipping_audit_logs;
CREATE POLICY "Admins manage all shipping audit logs"
  ON public.agent_shipping_audit_logs FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Agents view own shipping audit logs" ON public.agent_shipping_audit_logs;
CREATE POLICY "Agents view own shipping audit logs"
  ON public.agent_shipping_audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_shipping_quotes q
      WHERE q.id = agent_shipping_audit_logs.quote_id
        AND q.user_id = auth.uid()
    )
  );

-- 6. Link shipping_quote_id on agent_replenishment_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_replenishment_orders' AND column_name = 'shipping_quote_id'
  ) THEN
    ALTER TABLE public.agent_replenishment_orders ADD COLUMN shipping_quote_id uuid REFERENCES public.agent_shipping_quotes(id) ON DELETE SET NULL;
  END IF;
END $$;
