-- ==============================================================================
-- AFRICAN BOY INTERNATIONAL AGENT WHOLESALE PROGRAMME — DATABASE MIGRATION
-- ==============================================================================
-- Extends the schema with configurable partnership levels, quantity-based pricing
-- tiers, commercial proposals/offers, marketing benefit tiers, and tracking.

-- 1. Create wholesale_program_settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.wholesale_program_settings (
  id text PRIMARY KEY DEFAULT 'default',
  partnership_levels jsonb NOT NULL,
  enabled_categories text[] NOT NULL DEFAULT ARRAY['T-Shirt', 'Caps'],
  pricing_tiers jsonb NOT NULL,
  combine_mixed_quantities_for_tiers boolean NOT NULL DEFAULT false,
  marketing_benefit_tiers jsonb NOT NULL,
  currency_rates jsonb NOT NULL DEFAULT '{"TZS": 1, "USD": 0.00038, "KES": 0.05, "EUR": 0.00036, "GBP": 0.00031, "NGN": 0.6}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create agent_commercial_offers table
CREATE TABLE IF NOT EXISTS public.agent_commercial_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_reference text UNIQUE NOT NULL,
  application_id uuid REFERENCES public.agent_applications(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agent_profiles(id) ON DELETE SET NULL,
  applicant_name text NOT NULL,
  business_name text,
  partnership_level text NOT NULL,
  destination_country text NOT NULL,
  destination_city text NOT NULL,
  territory text,
  is_exclusive boolean NOT NULL DEFAULT false,
  exclusivity_terms text,
  currency text NOT NULL DEFAULT 'TZS',
  proposed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_units integer NOT NULL DEFAULT 0,
  merchandise_subtotal numeric NOT NULL DEFAULT 0.00,
  confirmed_shipping_rate numeric DEFAULT NULL,
  shipping_terms text NOT NULL DEFAULT 'Ex Works Dar es Salaam',
  shipping_disclaimer text NOT NULL DEFAULT 'International freight shipping, customs clearance, port handling fees, import duties, and VAT are excluded unless explicitly specified as confirmed freight.',
  payment_terms text NOT NULL DEFAULT '100% Pre-payment via Bank Wire Transfer prior to order dispatch',
  marketing_benefits text[] NOT NULL DEFAULT '{}',
  artist_disclaimer text NOT NULL DEFAULT 'Artist appearances, promotional visits, and performances are strictly not guaranteed, are outside the scope of this wholesale merchandise offer, and require a separate written agreement and talent management approval.',
  internal_notes text,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Sent', 'Accepted', 'Declined', 'Activated', 'Expired')
  ),
  accepted_at timestamptz,
  accepted_by_signature text,
  acceptance_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add tracking fields to replenishment orders if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_replenishment_orders' AND column_name = 'courier_name'
  ) THEN
    ALTER TABLE public.agent_replenishment_orders ADD COLUMN courier_name text;
    ALTER TABLE public.agent_replenishment_orders ADD COLUMN tracking_number text;
    ALTER TABLE public.agent_replenishment_orders ADD COLUMN tracking_url text;
    ALTER TABLE public.agent_replenishment_orders ADD COLUMN estimated_delivery date;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commercial_offers_app ON public.agent_commercial_offers(application_id);
CREATE INDEX IF NOT EXISTS idx_commercial_offers_agent ON public.agent_commercial_offers(agent_id);
CREATE INDEX IF NOT EXISTS idx_commercial_offers_ref ON public.agent_commercial_offers(offer_reference);
CREATE INDEX IF NOT EXISTS idx_commercial_offers_status ON public.agent_commercial_offers(status);

-- Enable RLS
ALTER TABLE public.wholesale_program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commercial_offers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.wholesale_program_settings TO anon, authenticated;
GRANT ALL ON public.wholesale_program_settings TO authenticated;

GRANT SELECT ON public.agent_commercial_offers TO authenticated;
GRANT ALL ON public.agent_commercial_offers TO authenticated;

-- Policies for wholesale_program_settings
CREATE POLICY "Anyone can view wholesale program settings"
  ON public.wholesale_program_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage wholesale program settings"
  ON public.wholesale_program_settings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies for agent_commercial_offers
CREATE POLICY "Admins manage all commercial offers"
  ON public.agent_commercial_offers FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Agents view their own commercial offers"
  ON public.agent_commercial_offers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_profiles ap
      WHERE ap.id = agent_commercial_offers.agent_id
        AND ap.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.agent_applications aa
      WHERE aa.id = agent_commercial_offers.application_id
        AND aa.user_id = auth.uid()
    )
  );

-- RPC to record offer acceptance
CREATE OR REPLACE FUNCTION public.record_commercial_offer_acceptance(
  _offer_id uuid,
  _signature text,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can record offer acceptance.';
  END IF;

  SELECT * INTO v_offer FROM public.agent_commercial_offers WHERE id = _offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commercial offer not found with id: %', _offer_id;
  END IF;

  UPDATE public.agent_commercial_offers
  SET
    status = 'Accepted',
    accepted_at = now(),
    accepted_by_signature = _signature,
    acceptance_notes = _notes,
    updated_at = now()
  WHERE id = _offer_id;

  INSERT INTO public.agent_audit_logs (
    application_id,
    performed_by,
    action,
    details
  )
  VALUES (
    v_offer.application_id,
    auth.uid(),
    'OFFER_ACCEPTED',
    jsonb_build_object(
      'offer_reference', v_offer.offer_reference,
      'signature', _signature,
      'accepted_at', now()
    )
  );

  RETURN jsonb_build_object('success', true, 'offer_id', _offer_id, 'status', 'Accepted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_commercial_offer_acceptance TO authenticated;
