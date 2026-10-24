-- ==============================================================================
-- AFRICAN BOY WHOLESALE PRICING ACCESS CONTROL & LEAD QUALIFICATION
-- ==============================================================================
-- Restricts public unauthenticated access to wholesale pricing schedules,
-- establishes lead-generation enquiry collection with server-validated access tokens,
-- separate enquiry statuses, and admin management.

CREATE TABLE IF NOT EXISTS public.wholesale_pricing_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_reference text UNIQUE NOT NULL,
  full_name text NOT NULL,
  business_email text NOT NULL,
  phone_number text NOT NULL,
  country text NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (
    business_type IN ('Retailer', 'Wholesaler', 'Distributor', 'Online Store', 'Other')
  ),
  estimated_order_quantity text NOT NULL,
  website_or_social text,
  preferred_categories text[] DEFAULT '{}',
  additional_notes text,
  consent_acknowledged boolean NOT NULL DEFAULT true,
  access_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  access_token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  pricing_accessed_at timestamptz,
  pricing_access_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'New Enquiry' CHECK (
    status IN ('New Enquiry', 'Pricing Access Granted', 'Under Review', 'Contacted', 'Converted', 'Rejected', 'Closed')
  ),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_application_id uuid REFERENCES public.agent_applications(id) ON DELETE SET NULL,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wholesale_enquiries_email ON public.wholesale_pricing_enquiries(business_email);
CREATE INDEX IF NOT EXISTS idx_wholesale_enquiries_token ON public.wholesale_pricing_enquiries(access_token);
CREATE INDEX IF NOT EXISTS idx_wholesale_enquiries_status ON public.wholesale_pricing_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_wholesale_enquiries_created ON public.wholesale_pricing_enquiries(created_at DESC);

-- Enable RLS
ALTER TABLE public.wholesale_pricing_enquiries ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.wholesale_pricing_enquiries TO authenticated;
GRANT SELECT, INSERT ON public.wholesale_pricing_enquiries TO anon;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wholesale_pricing_enquiries' AND policyname = 'Admins manage all wholesale enquiries'
  ) THEN
    CREATE POLICY "Admins manage all wholesale enquiries"
      ON public.wholesale_pricing_enquiries FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wholesale_pricing_enquiries' AND policyname = 'Users view own wholesale enquiries'
  ) THEN
    CREATE POLICY "Users view own wholesale enquiries"
      ON public.wholesale_pricing_enquiries FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wholesale_pricing_enquiries' AND policyname = 'Anon insert wholesale enquiries with valid consent'
  ) THEN
    CREATE POLICY "Anon insert wholesale enquiries with valid consent"
      ON public.wholesale_pricing_enquiries FOR INSERT TO anon, authenticated
      WITH CHECK (consent_acknowledged = true);
  END IF;
END $$;

-- RPC: submit_wholesale_pricing_enquiry
CREATE OR REPLACE FUNCTION public.submit_wholesale_pricing_enquiry(
  p_full_name text,
  p_business_email text,
  p_phone_number text,
  p_country text,
  p_business_name text,
  p_business_type text,
  p_estimated_order_quantity text,
  p_website_or_social text DEFAULT NULL,
  p_preferred_categories text[] DEFAULT '{}',
  p_additional_notes text DEFAULT NULL,
  p_consent_acknowledged boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref text;
  v_token uuid := gen_random_uuid();
  v_row record;
  v_existing record;
BEGIN
  -- 1. Input validations
  IF coalesce(length(trim(p_full_name)), 0) < 2 THEN
    RAISE EXCEPTION 'Please enter your full legal name.';
  END IF;
  IF coalesce(length(trim(p_business_email)), 0) < 5 OR p_business_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Please enter a valid business email address.';
  END IF;
  IF coalesce(length(trim(p_phone_number)), 0) < 6 THEN
    RAISE EXCEPTION 'Please enter a valid phone number with country code.';
  END IF;
  IF coalesce(length(trim(p_country)), 0) < 2 THEN
    RAISE EXCEPTION 'Please specify your business country.';
  END IF;
  IF coalesce(length(trim(p_business_name)), 0) < 2 THEN
    RAISE EXCEPTION 'Please enter your company or business name.';
  END IF;
  IF p_business_type NOT IN ('Retailer', 'Wholesaler', 'Distributor', 'Online Store', 'Other') THEN
    RAISE EXCEPTION 'Please select a valid business type.';
  END IF;
  IF coalesce(length(trim(p_estimated_order_quantity)), 0) < 1 THEN
    RAISE EXCEPTION 'Please indicate your estimated opening order quantity.';
  END IF;
  IF p_consent_acknowledged IS NOT TRUE THEN
    RAISE EXCEPTION 'Consent acknowledgement is required to submit a wholesale enquiry.';
  END IF;

  -- 2. Anti-spam / duplicate prevention within last 2 minutes
  SELECT * INTO v_existing FROM public.wholesale_pricing_enquiries
  WHERE lower(business_email) = lower(trim(p_business_email))
    AND created_at > now() - interval '2 minutes'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'enquiry_reference', v_existing.enquiry_reference,
      'access_token', v_existing.access_token,
      'access_token_expires_at', v_existing.access_token_expires_at,
      'status', v_existing.status,
      'is_duplicate', true
    );
  END IF;

  -- 3. Reference generation: WPE-2026-XXXXX
  v_ref := 'WPE-2026-' || lpad((floor(random() * 90000) + 10000)::int::text, 5, '0');
  WHILE EXISTS (SELECT 1 FROM public.wholesale_pricing_enquiries WHERE enquiry_reference = v_ref) LOOP
    v_ref := 'WPE-2026-' || lpad((floor(random() * 90000) + 10000)::int::text, 5, '0');
  END LOOP;

  -- 4. Insert enquiry
  INSERT INTO public.wholesale_pricing_enquiries (
    enquiry_reference,
    full_name,
    business_email,
    phone_number,
    country,
    business_name,
    business_type,
    estimated_order_quantity,
    website_or_social,
    preferred_categories,
    additional_notes,
    consent_acknowledged,
    access_token,
    user_id,
    status
  ) VALUES (
    v_ref,
    trim(p_full_name),
    lower(trim(p_business_email)),
    trim(p_phone_number),
    trim(p_country),
    trim(p_business_name),
    p_business_type,
    trim(p_estimated_order_quantity),
    nullif(trim(p_website_or_social), ''),
    coalesce(p_preferred_categories, '{}'),
    nullif(trim(p_additional_notes), ''),
    p_consent_acknowledged,
    v_token,
    auth.uid(),
    'New Enquiry'
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'enquiry_reference', v_row.enquiry_reference,
    'access_token', v_row.access_token,
    'access_token_expires_at', v_row.access_token_expires_at,
    'status', v_row.status,
    'is_duplicate', false
  );
END $$;
GRANT EXECUTE ON FUNCTION public.submit_wholesale_pricing_enquiry(text,text,text,text,text,text,text,text,text[],text,boolean) TO anon, authenticated;

-- RPC: get_wholesale_pricing_schedule(p_token uuid)
CREATE OR REPLACE FUNCTION public.get_wholesale_pricing_schedule(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enquiry record;
  v_is_admin boolean := false;
  v_is_agent boolean := false;
  v_pricing jsonb;
BEGIN
  -- Check admin
  v_is_admin := public.is_admin();

  -- Check authenticated active agent
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.agent_profiles WHERE user_id = auth.uid() AND status = 'active'
    ) INTO v_is_agent;
  END IF;

  -- Validate token if not admin and not active agent
  IF NOT v_is_admin AND NOT v_is_agent THEN
    IF p_token IS NULL THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'Access denied: A valid wholesale enquiry access token or verified distributor login is required.'
      );
    END IF;

    SELECT * INTO v_enquiry FROM public.wholesale_pricing_enquiries
    WHERE access_token = p_token AND access_token_expires_at > now();

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'Invalid or expired wholesale pricing access token. Please submit a wholesale enquiry to receive access.'
      );
    END IF;

    -- Update record with access tracking and status
    UPDATE public.wholesale_pricing_enquiries
    SET
      pricing_accessed_at = now(),
      pricing_access_count = pricing_access_count + 1,
      status = CASE WHEN status = 'New Enquiry' THEN 'Pricing Access Granted' ELSE status END,
      updated_at = now()
    WHERE id = v_enquiry.id;
  END IF;

  -- Retrieve current approved pricing settings or construct authoritative tiers
  SELECT pricing_tiers INTO v_pricing FROM public.wholesale_program_settings WHERE id = 'default';
  IF v_pricing IS NULL THEN
    v_pricing := jsonb_build_object(
      'T-Shirt', jsonb_build_array(
        jsonb_build_object('id', 'tshirt-tier-1', 'category', 'T-Shirt', 'label', 'Tier 1 (500–999 units)', 'minQuantity', 500, 'maxQuantity', 999, 'unitPriceTZS', 35000),
        jsonb_build_object('id', 'tshirt-tier-2', 'category', 'T-Shirt', 'label', 'Tier 2 (1,000+ units - Distributor MOQ)', 'minQuantity', 1000, 'maxQuantity', null, 'unitPriceTZS', 30000)
      ),
      'Caps', jsonb_build_array(
        jsonb_build_object('id', 'cap-tier-1', 'category', 'Caps', 'label', 'Wholesale Tier (300+ units)', 'minQuantity', 300, 'maxQuantity', null, 'unitPriceTZS', 18000)
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'is_admin', v_is_admin,
    'is_agent', v_is_agent,
    'enquiry_reference', v_enquiry.enquiry_reference,
    'business_name', v_enquiry.business_name,
    'applicant_name', v_enquiry.full_name,
    'expires_at', v_enquiry.access_token_expires_at,
    'currency', 'TZS',
    'pricing_tiers', v_pricing,
    'rules', jsonb_build_object(
      'tshirt_tier_1', 'TZS 35,000 per unit (500–999 pieces)',
      'tshirt_tier_2', 'TZS 30,000 per unit (1,000+ pieces)',
      'tshirt_under_min', 'Orders below 500 units require authorised administrative review.',
      'caps_wholesale_tier', 'TZS 18,000 per unit (300+ pieces)',
      'caps_under_min', 'Orders below 300 pieces require authorised review.',
      'caps_opening_order_credit', 'Caps count toward the 1,000-piece distributor opening-order requirement.',
      'mixed_order_policy', 'Eligible products can be combined toward the 1,000-piece opening order.',
      'distributor_policy', 'Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.',
      'separate_shipping', 'Product merchandise sales exclude shipping costs. Freight quotations are provided and verified separately from Dar es Salaam or China factory-direct.'
    )
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_wholesale_pricing_schedule(uuid) TO anon, authenticated;
