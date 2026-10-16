-- ==============================================================================
-- AFRICAN BOY: AGENT INBOX, APPLICANT PORTAL, INTL TRACKING & INVOICES
-- ==============================================================================

-- 1. Ensure access_token on agent_applications for guest applicant portal access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_applications' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE public.agent_applications ADD COLUMN access_token uuid NOT NULL DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_applications' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE public.agent_applications ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_applications_token ON public.agent_applications(access_token);
CREATE INDEX IF NOT EXISTS idx_agent_applications_activity ON public.agent_applications(last_activity_at);

-- 2. Create agent_application_messages table for Admin Inbox & Applicant conversation
CREATE TABLE IF NOT EXISTS public.agent_application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.agent_applications(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('applicant', 'admin')),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_internal_note boolean NOT NULL DEFAULT false,
  delivery_status text NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('sent', 'delivered', 'read')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_msg_app_id ON public.agent_application_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_agent_msg_created ON public.agent_application_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_msg_internal ON public.agent_application_messages(is_internal_note);

ALTER TABLE public.agent_application_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.agent_application_messages TO anon, authenticated;
GRANT ALL ON public.agent_application_messages TO service_role;

-- Policies for agent_application_messages
DROP POLICY IF EXISTS "Admins manage all application messages" ON public.agent_application_messages;
CREATE POLICY "Admins manage all application messages"
  ON public.agent_application_messages FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Applicants read own non-internal messages" ON public.agent_application_messages;
CREATE POLICY "Applicants read own non-internal messages"
  ON public.agent_application_messages FOR SELECT TO authenticated
  USING (
    is_internal_note = false AND
    EXISTS (
      SELECT 1 FROM public.agent_applications a
      WHERE a.id = agent_application_messages.application_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Applicants send messages to own application" ON public.agent_application_messages;
CREATE POLICY "Applicants send messages to own application"
  ON public.agent_application_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'applicant' AND
    is_internal_note = false AND
    EXISTS (
      SELECT 1 FROM public.agent_applications a
      WHERE a.id = agent_application_messages.application_id
        AND a.user_id = auth.uid()
    )
  );

-- 3. Extend international_order_requests with tracking, quotes & status fields
ALTER TABLE public.international_order_requests DROP CONSTRAINT IF EXISTS intl_status_chk;

ALTER TABLE public.international_order_requests ADD CONSTRAINT intl_status_chk CHECK (
  status IN (
    'REQUESTED',
    'STOCK_CHECK',
    'SHIPPING_QUOTE_PREPARING',
    'SHIPPING_QUOTE',
    'AWAITING_CUSTOMER',
    'PAYMENT_PENDING',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DISPATCHED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'ON_HOLD'
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'shipping_method'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN shipping_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'quote_valid_until'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN quote_valid_until date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'tracking_number'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN tracking_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'tracking_url'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN tracking_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'dispatched_at'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN dispatched_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN delivered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN internal_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'customer_notes'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN customer_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'international_order_requests' AND column_name = 'payment_reference'
  ) THEN
    ALTER TABLE public.international_order_requests ADD COLUMN payment_reference text;
  END IF;
END $$;

-- 4. Create international_order_timeline for full audit trail
CREATE TABLE IF NOT EXISTS public.international_order_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.international_order_requests(id) ON DELETE CASCADE,
  status text NOT NULL,
  title text NOT NULL,
  description text,
  actor_type text NOT NULL CHECK (actor_type IN ('system', 'admin', 'customer')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_customer_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intl_timeline_req ON public.international_order_timeline(request_id);
CREATE INDEX IF NOT EXISTS idx_intl_timeline_created ON public.international_order_timeline(created_at);

ALTER TABLE public.international_order_timeline ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.international_order_timeline TO anon, authenticated;
GRANT ALL ON public.international_order_timeline TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins manage international order timeline" ON public.international_order_timeline;
CREATE POLICY "Admins manage international order timeline"
  ON public.international_order_timeline FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Customers view visible timeline events" ON public.international_order_timeline;
CREATE POLICY "Customers view visible timeline events"
  ON public.international_order_timeline FOR SELECT TO authenticated
  USING (
    is_customer_visible = true AND
    EXISTS (
      SELECT 1 FROM public.international_order_requests r
      WHERE r.id = international_order_timeline.request_id
        AND r.customer_id = auth.uid()
    )
  );

-- 5. Extend invoices table with access token, order_type, and relations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN access_token uuid NOT NULL DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN order_type text DEFAULT 'retail';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'international_request_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN international_request_id uuid REFERENCES public.international_order_requests(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'agent_order_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN agent_order_id uuid REFERENCES public.agent_replenishment_orders(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0.00;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_token ON public.invoices(access_token);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_intl_req ON public.invoices(international_request_id);

-- Invoices RLS: Customers can view their own invoices
DROP POLICY IF EXISTS "Customers view own invoices" ON public.invoices;
CREATE POLICY "Customers view own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid() OR
    public.is_admin()
  );

-- 6. RPC: Public customer view of international request with timeline and tracking
CREATE OR REPLACE FUNCTION public.get_international_request(p_reference text, p_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row record;
  v_timeline jsonb;
  v_invoice jsonb;
BEGIN
  SELECT * INTO v_row
  FROM international_order_requests
  WHERE reference_number = p_reference
    AND (
      (p_token IS NOT NULL AND access_token = p_token)
      OR (auth.uid() IS NOT NULL AND customer_id = auth.uid())
      OR public.is_admin()
    );

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fetch customer-visible timeline events
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'status', t.status,
      'title', t.title,
      'description', t.description,
      'actor_type', t.actor_type,
      'created_at', t.created_at
    ) ORDER BY t.created_at ASC
  ), '[]'::jsonb) INTO v_timeline
  FROM international_order_timeline t
  WHERE t.request_id = v_row.id AND t.is_customer_visible = true;

  -- Check for issued invoice
  SELECT jsonb_build_object(
    'invoice_number', inv.invoice_number,
    'total_amount', inv.total_amount,
    'currency', inv.currency,
    'payment_status', inv.payment_status,
    'issue_date', inv.issue_date,
    'access_token', inv.access_token
  ) INTO v_invoice
  FROM invoices inv
  WHERE inv.international_request_id = v_row.id
  ORDER BY inv.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'reference_number', v_row.reference_number,
    'customer_name', v_row.customer_name,
    'customer_email', v_row.customer_email,
    'customer_phone', v_row.customer_phone,
    'country', v_row.country,
    'city', v_row.city,
    'address', v_row.address,
    'cart_items', (SELECT coalesce(jsonb_agg(e - 'product_id' - 'variant_id'), '[]'::jsonb) FROM jsonb_array_elements(v_row.cart_items) e),
    'product_total', v_row.product_total,
    'currency', v_row.currency,
    'shipping_cost', v_row.shipping_cost,
    'shipping_currency', v_row.shipping_currency,
    'final_total', v_row.final_total,
    'final_currency', v_row.final_currency,
    'shipping_method', v_row.shipping_method,
    'shipping_provider', v_row.shipping_provider,
    'estimated_delivery', v_row.estimated_delivery,
    'quote_valid_until', v_row.quote_valid_until,
    'tracking_number', v_row.tracking_number,
    'tracking_url', v_row.tracking_url,
    'dispatched_at', v_row.dispatched_at,
    'delivered_at', v_row.delivered_at,
    'shipping_notes', v_row.shipping_notes,
    'customer_notes', v_row.customer_notes,
    'status', v_row.status,
    'timeline', v_timeline,
    'invoice', v_invoice,
    'created_at', v_row.created_at
  );
END $$;

-- 7. RPC: Secure Applicant Portal View (owner or private access token)
CREATE OR REPLACE FUNCTION public.get_agent_applicant_portal(p_reference text, p_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app record;
  v_msgs jsonb;
BEGIN
  SELECT * INTO v_app
  FROM agent_applications
  WHERE application_reference = p_reference
    AND (
      (p_token IS NOT NULL AND access_token = p_token)
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR public.is_admin()
    );

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Load non-internal messages for applicant
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'sender_type', m.sender_type,
      'sender_name', m.sender_name,
      'message', m.message,
      'attachments', m.attachments,
      'created_at', m.created_at,
      'read_at', m.read_at
    ) ORDER BY m.created_at ASC
  ), '[]'::jsonb) INTO v_msgs
  FROM agent_application_messages m
  WHERE m.application_id = v_app.id AND m.is_internal_note = false;

  RETURN jsonb_build_object(
    'id', v_app.id,
    'application_reference', v_app.application_reference,
    'full_name', v_app.full_name,
    'business_name', v_app.business_name,
    'email', v_app.email,
    'phone_number', v_app.phone_number,
    'country_code', v_app.country_code,
    'country_name', v_app.country_name,
    'city', v_app.city,
    'business_type', v_app.business_type,
    'requested_categories', v_app.requested_categories,
    'preferred_business_model', v_app.preferred_business_model,
    'proposed_territory_details', v_app.proposed_territory_details,
    'years_of_experience', v_app.years_of_experience,
    'motivation', v_app.motivation,
    'status', v_app.status,
    'admin_feedback_to_applicant', v_app.admin_feedback_to_applicant,
    'messages', v_msgs,
    'created_at', v_app.created_at,
    'updated_at', v_app.updated_at
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_agent_applicant_portal(text, uuid) TO anon, authenticated;

-- 8. RPC: Send message as applicant
CREATE OR REPLACE FUNCTION public.send_agent_applicant_message(p_reference text, p_token uuid, p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app record;
  v_msg_id uuid;
BEGIN
  IF coalesce(length(trim(p_message)), 0) < 1 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  SELECT * INTO v_app
  FROM agent_applications
  WHERE application_reference = p_reference
    AND (
      (p_token IS NOT NULL AND access_token = p_token)
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or invalid application reference';
  END IF;

  INSERT INTO agent_application_messages(
    application_id, sender_type, sender_id, sender_name, message, is_internal_note, delivery_status
  ) VALUES (
    v_app.id, 'applicant', auth.uid(), v_app.full_name, trim(p_message), false, 'delivered'
  ) RETURNING id INTO v_msg_id;

  -- Update application last activity timestamp
  UPDATE agent_applications
  SET last_activity_at = now(), updated_at = now()
  WHERE id = v_app.id;

  RETURN jsonb_build_object('success', true, 'message_id', v_msg_id);
END $$;
GRANT EXECUTE ON FUNCTION public.send_agent_applicant_message(text, uuid, text) TO anon, authenticated;
