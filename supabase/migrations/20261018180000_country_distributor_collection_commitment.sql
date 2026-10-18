-- Migration: Country Distributor Collection Commitment & Tracking
-- Non-destructive additive migration supporting 4 annual collections commitment (1,000 pcs/collection, 4,000 pcs/year)
-- Preserves existing proposal ABA-OFF-2026-KEX97J as historical evidence with flag for review

DO $$ 
BEGIN
  -- Additive columns on agent_commercial_offers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_commercial_offers' AND column_name = 'annual_collection_commitment') THEN
    ALTER TABLE public.agent_commercial_offers ADD COLUMN annual_collection_commitment jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_commercial_offers' AND column_name = 'flagged_for_review') THEN
    ALTER TABLE public.agent_commercial_offers ADD COLUMN flagged_for_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_commercial_offers' AND column_name = 'review_required_reason') THEN
    ALTER TABLE public.agent_commercial_offers ADD COLUMN review_required_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_commercial_offers' AND column_name = 'is_historical_baseline') THEN
    ALTER TABLE public.agent_commercial_offers ADD COLUMN is_historical_baseline boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_commercial_offers' AND column_name = 'parent_offer_reference') THEN
    ALTER TABLE public.agent_commercial_offers ADD COLUMN parent_offer_reference text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_commercial_offers' AND column_name = 'version') THEN
    ALTER TABLE public.agent_commercial_offers ADD COLUMN version integer DEFAULT 1;
  END IF;
END $$;

-- Table for tracking individual distributor collections (4 collections/year)
CREATE TABLE IF NOT EXISTS public.distributor_collection_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.agent_applications(id) ON DELETE SET NULL,
  collection_id text NOT NULL,
  collection_number integer NOT NULL,
  collection_name text NOT NULL,
  is_opening_order boolean DEFAULT false,
  minimum_commitment integer DEFAULT 1000,
  quantity_ordered integer DEFAULT 0,
  quantity_paid integer DEFAULT 0,
  quantity_fulfilled integer DEFAULT 0,
  status text DEFAULT 'Pending Order',
  order_reference text,
  order_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distro_collections_agent ON public.distributor_collection_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_distro_collections_app ON public.distributor_collection_orders(application_id);
CREATE INDEX IF NOT EXISTS idx_distro_collections_col ON public.distributor_collection_orders(collection_id);

ALTER TABLE public.distributor_collection_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'distributor_collection_orders' AND policyname = 'Admins manage collection tracking'
  ) THEN
    CREATE POLICY "Admins manage collection tracking" ON public.distributor_collection_orders
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'distributor_collection_orders' AND policyname = 'Agents view own collection tracking'
  ) THEN
    CREATE POLICY "Agents view own collection tracking" ON public.distributor_collection_orders
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.agent_profiles ap
          WHERE ap.id = distributor_collection_orders.agent_id
            AND ap.user_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT ALL ON public.distributor_collection_orders TO authenticated;

-- Seed historical proposal ABA-OFF-2026-KEX97J for David Mwangi if not present
DO $$
DECLARE
  v_app_id uuid;
BEGIN
  SELECT id INTO v_app_id FROM public.agent_applications WHERE application_reference = 'ABA-2026-NBO94' LIMIT 1;
  
  IF v_app_id IS NOT NULL THEN
    INSERT INTO public.agent_commercial_offers (
      offer_reference, application_id, applicant_name, business_name, partnership_level,
      destination_country, destination_city, territory, is_exclusive, exclusivity_terms,
      currency, proposed_items, total_units, merchandise_subtotal, shipping_terms,
      shipping_disclaimer, payment_terms, marketing_benefits, artist_disclaimer,
      internal_notes, expiry_date, status, flagged_for_review, review_required_reason,
      is_historical_baseline, version, commercial_terms
    ) VALUES (
      'ABA-OFF-2026-KEX97J',
      v_app_id,
      'David Mwangi',
      'Savannah Streetwear Ltd',
      'Country Distributor',
      'Kenya',
      'Nairobi',
      'Kenya (National)',
      true,
      'National exclusivity is subject to minimum replenishment of 100 units per quarter.',
      'TZS',
      '[
        {
          "productId": "prod-sample-tshirt-01",
          "name": "African Boy Signature Heavyweight Tee",
          "sku": "AFB-TEE-BLK-L",
          "category": "T-Shirt",
          "quantity": 700,
          "unitPrice": 30000,
          "retailPrice": 55000,
          "lineTotal": 21000000,
          "appliedTierLabel": "1,000+ Units Tier",
          "size": "L",
          "color": "Jet Black / Gold Foil"
        },
        {
          "productId": "prod-sample-cap-01",
          "name": "African Boy Structured Logo Cap",
          "sku": "AFB-CAP-GLD",
          "category": "Caps",
          "quantity": 300,
          "unitPrice": 18000,
          "retailPrice": 35000,
          "lineTotal": 5400000,
          "appliedTierLabel": "300+ Units Tier",
          "size": "Adjustable",
          "color": "Black / Gold Metal Crest"
        }
      ]'::jsonb,
      1000,
      26400000,
      'Ex Works Dar es Salaam — International freight to Nairobi quoted and billed separately prior to dispatch',
      'Unless explicitly agreed in writing as confirmed freight, this wholesale quotation is strictly EX-WORKS (Dar es Salaam, Tanzania). The Purchaser/Agent assumes full responsibility for all international freight shipping charges, transit insurance, import tariffs, customs clearance, port handling fees, VAT, and destination duties.',
      '100% Pre-payment via Bank Wire Transfer prior to order dispatch',
      '["Official Master Brand Asset Cloud Access (4K lookbooks, campaign assets, video loops)", "Brand guideline kit & product authenticity verification assets", "Official listing on africanboy.africa/stockists authorized global partners directory", "Priority allocation on capsule releases"]'::jsonb,
      'Artist appearances, live performances, store visits, and promotional appearances by Jux or African Boy brand ambassadors are strictly not guaranteed, are outside the scope of this wholesale merchandise offer, and require a separate written agreement and formal talent management approval.',
      'Initial Kenya distribution proposal. Note: contains historical replenishment term (100 units per quarter). Flagged for authorised review to issue revised offer/addendum reflecting new 4 annual collections commitment (1,000 pcs per collection, 4,000 pcs/year).',
      '2026-12-31',
      'Sent',
      true,
      'Historical proposal states national exclusivity is subject to minimum replenishment of 100 units per quarter. Requires authorised administrator review to issue revised offer (or addendum) reflecting new policy: 1,000 pieces per collection across 4 annual collections (4,000 units/year). Do not overwrite original proposal.',
      true,
      1,
      '{
        "minimumReplenishmentOrder": "100 units per quarter",
        "processingDispatchTime": "10 - 14 business days from payment receipt",
        "potentialShippingOrigins": ["Tanzania (Dar es Salaam Hub)", "China (Guangzhou Port)"]
      }'::jsonb
    )
    ON CONFLICT (offer_reference) DO NOTHING;
  END IF;
END $$;
