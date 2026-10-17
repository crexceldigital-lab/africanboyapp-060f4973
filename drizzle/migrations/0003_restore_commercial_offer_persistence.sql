CREATE TABLE IF NOT EXISTS public.agent_commercial_offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), offer_reference text UNIQUE NOT NULL,
 application_id uuid REFERENCES public.agent_applications(id) ON DELETE CASCADE,
 agent_id uuid, applicant_name text NOT NULL, business_name text,
 partnership_level text NOT NULL, destination_country text NOT NULL, destination_city text NOT NULL,
 territory text, is_exclusive boolean NOT NULL DEFAULT false, exclusivity_terms text,
 currency text NOT NULL DEFAULT 'TZS', proposed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
 total_units integer NOT NULL DEFAULT 0, merchandise_subtotal numeric NOT NULL DEFAULT 0,
 confirmed_shipping_rate numeric, shipping_terms text NOT NULL DEFAULT '', shipping_disclaimer text NOT NULL DEFAULT '',
 payment_terms text NOT NULL DEFAULT '', marketing_benefits text[] NOT NULL DEFAULT '{}',
 artist_disclaimer text NOT NULL DEFAULT '', internal_notes text, expiry_date date NOT NULL,
 status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Accepted','Declined','Activated','Expired')),
 accepted_at timestamptz, accepted_by_signature text, acceptance_notes text,
 created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 commercial_terms jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_commercial_offers TO authenticated;
GRANT ALL ON public.agent_commercial_offers TO service_role;
ALTER TABLE public.agent_commercial_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage proposals" ON public.agent_commercial_offers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Applicants read own proposals" ON public.agent_commercial_offers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.agent_applications a WHERE a.id = agent_commercial_offers.application_id AND a.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS commercial_offers_application_idx ON public.agent_commercial_offers(application_id,created_at DESC);
COMMENT ON TABLE public.agent_commercial_offers IS 'Saved wholesale proposals used by the existing commercial-offer service; goods-only quotation amounts.';