-- ==============================================================================
-- AFRICAN BOY GLOBAL AGENT PROGRAM — DATABASE MIGRATION
-- ==============================================================================
-- Extends the Supabase schema to support international agent recruitment,
-- multi-country distributor management, commercial agreements, replenishment orders,
-- strict Row Level Security (RLS), and server-side RPC approval workflows.

-- 1. Extend app_role enum to include 'agent'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_enum en ON en.enumtypid = typ.oid
    WHERE typ.typname = 'app_role' AND en.enumlabel = 'agent'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'agent';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create agent_applications table
CREATE TABLE IF NOT EXISTS public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_reference text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  country_code text NOT NULL,
  country_name text NOT NULL,
  city text NOT NULL,
  preferred_language text DEFAULT 'en',
  business_name text,
  business_type text NOT NULL,
  website_or_social text,
  business_address text,
  business_registration_number text,
  years_of_experience text DEFAULT '0-2 years',
  previous_experience_details text,
  requested_categories text[] NOT NULL DEFAULT '{}',
  preferred_business_model text NOT NULL,
  proposed_territory_details text,
  expected_monthly_sales text,
  estimated_initial_investment text,
  preferred_sales_channels text[] DEFAULT '{}',
  marketing_activities text,
  motivation text,
  status text NOT NULL DEFAULT 'Submitted' CHECK (
    status IN ('Draft', 'Submitted', 'Under Review', 'More Information Required', 'Approved', 'Rejected', 'Withdrawn')
  ),
  internal_notes text,
  admin_feedback_to_applicant text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  terms_accepted boolean NOT NULL DEFAULT true,
  privacy_accepted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create agent_profiles table
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.agent_applications(id) ON DELETE SET NULL,
  agent_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  business_name text,
  business_model text NOT NULL CHECK (
    business_model IN ('Wholesale Reseller', 'Commission-Based Agent', 'Country Distributor')
  ),
  assigned_country_code text NOT NULL,
  assigned_country_name text NOT NULL,
  assigned_territory text NOT NULL DEFAULT 'National',
  is_exclusive boolean NOT NULL DEFAULT false,
  exclusivity_conditions text,
  approved_categories text[] NOT NULL DEFAULT '{}',
  commission_rate numeric NOT NULL DEFAULT 0.00,
  wholesale_discount_percent numeric NOT NULL DEFAULT 0.00,
  minimum_order_quantity integer NOT NULL DEFAULT 10,
  minimum_initial_purchase numeric NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'TZS',
  payment_terms text NOT NULL DEFAULT 'Pre-payment',
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'suspended', 'pending_agreement', 'terminated')
  ),
  agreement_reference text,
  agreement_status text DEFAULT 'Active',
  agreement_start_date date DEFAULT CURRENT_DATE,
  agreement_end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create agent_commercial_agreements table
CREATE TABLE IF NOT EXISTS public.agent_commercial_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  agreement_number text UNIQUE NOT NULL,
  title text NOT NULL,
  business_model text NOT NULL,
  territory text NOT NULL,
  is_exclusive boolean DEFAULT false,
  categories text[] DEFAULT '{}',
  commission_rate numeric DEFAULT 0.00,
  wholesale_discount_percent numeric DEFAULT 0.00,
  moq integer DEFAULT 10,
  currency text DEFAULT 'TZS',
  payment_terms text DEFAULT 'Pre-payment',
  status text DEFAULT 'Active' CHECK (
    status IN ('Draft', 'Active', 'Expired', 'Terminated', 'Under Review')
  ),
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  terms_document_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create agent_product_pricing table (per-product / per-SKU custom pricing)
CREATE TABLE IF NOT EXISTS public.agent_product_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  sku text,
  custom_wholesale_price numeric NOT NULL,
  custom_moq integer DEFAULT 1,
  currency text DEFAULT 'TZS',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Create agent_replenishment_orders table
CREATE TABLE IF NOT EXISTS public.agent_replenishment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('draft', 'submitted', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
  ),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'partial', 'cancelled')
  ),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0.00,
  discount_amount numeric NOT NULL DEFAULT 0.00,
  shipping_fee numeric NOT NULL DEFAULT 0.00,
  total_amount numeric NOT NULL DEFAULT 0.00,
  amount_paid numeric NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'TZS',
  shipping_address text,
  destination_country text,
  destination_city text,
  commercial_terms_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Create agent_audit_logs table
CREATE TABLE IF NOT EXISTS public.agent_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agent_profiles(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.agent_applications(id) ON DELETE SET NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance and quick searching
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON public.agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_country ON public.agent_applications(country_code);
CREATE INDEX IF NOT EXISTS idx_agent_applications_ref ON public.agent_applications(application_reference);
CREATE INDEX IF NOT EXISTS idx_agent_applications_user ON public.agent_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_user ON public.agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_code ON public.agent_profiles(agent_code);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_country ON public.agent_profiles(assigned_country_code);

CREATE INDEX IF NOT EXISTS idx_agent_replenishment_orders_agent ON public.agent_replenishment_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_replenishment_orders_status ON public.agent_replenishment_orders(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commercial_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_replenishment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON public.agent_applications TO anon, authenticated;
GRANT UPDATE, DELETE ON public.agent_applications TO authenticated;

GRANT SELECT ON public.agent_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.agent_profiles TO authenticated;

GRANT SELECT ON public.agent_commercial_agreements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.agent_commercial_agreements TO authenticated;

GRANT SELECT ON public.agent_product_pricing TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.agent_product_pricing TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.agent_replenishment_orders TO authenticated;
GRANT DELETE ON public.agent_replenishment_orders TO authenticated;

GRANT SELECT, INSERT ON public.agent_audit_logs TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Policies for agent_applications
-- 1. Applicants can view their own application (by auth.uid() or reference matching session)
CREATE POLICY "Applicants read own applications or admins read all"
  ON public.agent_applications FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    public.is_admin()
  );

-- 2. Anyone can submit an application (insert)
CREATE POLICY "Anyone can submit an agent application"
  ON public.agent_applications FOR INSERT
  WITH CHECK (true);

-- 3. Only admins can update applications (or applicant can withdraw their own)
CREATE POLICY "Admins or owners update application"
  ON public.agent_applications FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR
    (auth.uid() = user_id AND status IN ('Draft', 'More Information Required'))
  );

-- 4. Only admins can delete applications
CREATE POLICY "Admins delete applications"
  ON public.agent_applications FOR DELETE TO authenticated
  USING (public.is_admin());

-- Policies for agent_profiles
-- 1. Agents can read their own profile, Admins read all
CREATE POLICY "Agents view own profile or admins view all"
  ON public.agent_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    public.is_admin()
  );

-- 2. Only Admins can insert/update agent profiles
CREATE POLICY "Admins manage agent profiles"
  ON public.agent_profiles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies for agent_commercial_agreements
CREATE POLICY "Agents view own agreements or admins view all"
  ON public.agent_commercial_agreements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_profiles ap
      WHERE ap.id = agent_commercial_agreements.agent_id
        AND ap.user_id = auth.uid()
    ) OR
    public.is_admin()
  );

CREATE POLICY "Admins manage agreements"
  ON public.agent_commercial_agreements FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies for agent_replenishment_orders
CREATE POLICY "Agents view own replenishment orders or admins view all"
  ON public.agent_replenishment_orders FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    public.is_admin()
  );

CREATE POLICY "Agents create replenishment orders"
  ON public.agent_replenishment_orders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    public.is_admin()
  );

CREATE POLICY "Agents or admins update replenishment orders"
  ON public.agent_replenishment_orders FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    public.is_admin()
  );

-- Policies for agent_audit_logs
CREATE POLICY "Admins view agent audit logs"
  ON public.agent_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins and system insert audit logs"
  ON public.agent_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- SERVER-SIDE RPC FUNCTIONS
-- ==============================================================================

-- 1. Helper function to approve an agent application
CREATE OR REPLACE FUNCTION public.approve_agent_application(
  _application_id uuid,
  _agent_code text,
  _business_model text,
  _territory text,
  _categories text[],
  _wholesale_discount numeric DEFAULT 30.00,
  _commission_rate numeric DEFAULT 15.00,
  _moq integer DEFAULT 10,
  _currency text DEFAULT 'TZS',
  _is_exclusive boolean DEFAULT false,
  _exclusivity_conditions text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app record;
  v_agent_id uuid;
  v_agreement_num text;
  v_user_id uuid;
BEGIN
  -- Security check: only admin can execute
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can approve agents.';
  END IF;

  SELECT * INTO v_app FROM public.agent_applications WHERE id = _application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found with id: %', _application_id;
  END IF;

  v_user_id := v_app.user_id;

  -- Update application status
  UPDATE public.agent_applications
  SET
    status = 'Approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = _application_id;

  -- Ensure role 'agent' is assigned in user_roles if user exists
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'agent'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Upsert into agent_profiles
    INSERT INTO public.agent_profiles (
      user_id,
      application_id,
      agent_code,
      full_name,
      email,
      phone_number,
      business_name,
      business_model,
      assigned_country_code,
      assigned_country_name,
      assigned_territory,
      is_exclusive,
      exclusivity_conditions,
      approved_categories,
      commission_rate,
      wholesale_discount_percent,
      minimum_order_quantity,
      currency,
      status,
      agreement_reference
    )
    VALUES (
      v_user_id,
      _application_id,
      _agent_code,
      v_app.full_name,
      v_app.email,
      v_app.phone_number,
      v_app.business_name,
      _business_model,
      v_app.country_code,
      v_app.country_name,
      _territory,
      _is_exclusive,
      _exclusivity_conditions,
      _categories,
      _commission_rate,
      _wholesale_discount,
      _moq,
      _currency,
      'active',
      'AGR-' || _agent_code || '-2026'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      business_model = EXCLUDED.business_model,
      assigned_territory = EXCLUDED.assigned_territory,
      is_exclusive = EXCLUDED.is_exclusive,
      approved_categories = EXCLUDED.approved_categories,
      commission_rate = EXCLUDED.commission_rate,
      wholesale_discount_percent = EXCLUDED.wholesale_discount_percent,
      minimum_order_quantity = EXCLUDED.minimum_order_quantity,
      currency = EXCLUDED.currency,
      status = 'active',
      updated_at = now()
    RETURNING id INTO v_agent_id;

    -- Create commercial agreement record
    v_agreement_num := 'AGR-' || _agent_code || '-2026';
    INSERT INTO public.agent_commercial_agreements (
      agent_id,
      agreement_number,
      title,
      business_model,
      territory,
      is_exclusive,
      categories,
      commission_rate,
      wholesale_discount_percent,
      moq,
      currency,
      status,
      valid_from,
      created_by
    )
    VALUES (
      v_agent_id,
      v_agreement_num,
      'Authorized African Boy ' || _business_model || ' Agreement',
      _business_model,
      _territory,
      _is_exclusive,
      _categories,
      _commission_rate,
      _wholesale_discount,
      _moq,
      _currency,
      'Active',
      CURRENT_DATE,
      auth.uid()
    )
    ON CONFLICT (agreement_number) DO UPDATE SET
      status = 'Active',
      updated_at = now();
  END IF;

  -- Record audit log
  INSERT INTO public.agent_audit_logs (
    agent_id,
    application_id,
    performed_by,
    action,
    details
  )
  VALUES (
    v_agent_id,
    _application_id,
    auth.uid(),
    'APPLICATION_APPROVED',
    jsonb_build_object(
      'agent_code', _agent_code,
      'business_model', _business_model,
      'territory', _territory,
      'wholesale_discount', _wholesale_discount,
      'commission_rate', _commission_rate
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'agent_id', v_agent_id,
    'agent_code', _agent_code,
    'application_id', _application_id
  );
END;
$$;

-- 2. Helper function to reject an agent application
CREATE OR REPLACE FUNCTION public.reject_agent_application(
  _application_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can reject agent applications.';
  END IF;

  UPDATE public.agent_applications
  SET
    status = 'Rejected',
    admin_feedback_to_applicant = _reason,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = _application_id;

  INSERT INTO public.agent_audit_logs (
    application_id,
    performed_by,
    action,
    details
  )
  VALUES (
    _application_id,
    auth.uid(),
    'APPLICATION_REJECTED',
    jsonb_build_object('reason', _reason)
  );

  RETURN jsonb_build_object('success', true, 'application_id', _application_id);
END;
$$;

-- Grant execute permissions to authenticated
GRANT EXECUTE ON FUNCTION public.approve_agent_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_agent_application TO authenticated;
