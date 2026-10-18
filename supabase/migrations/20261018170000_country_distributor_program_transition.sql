-- Migration: Country Distributor Programme Transition
-- Non-destructive additive migration for Country Distributor capability assessment and preserving 3 existing applications

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'market_entry_plan') THEN
    ALTER TABLE public.agent_applications ADD COLUMN market_entry_plan text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'first_year_sales_forecast') THEN
    ALTER TABLE public.agent_applications ADD COLUMN first_year_sales_forecast text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'operating_budget_plan') THEN
    ALTER TABLE public.agent_applications ADD COLUMN operating_budget_plan text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'financial_capacity_statement') THEN
    ALTER TABLE public.agent_applications ADD COLUMN financial_capacity_statement text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'team_and_infrastructure') THEN
    ALTER TABLE public.agent_applications ADD COLUMN team_and_infrastructure text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'supporting_documents_url') THEN
    ALTER TABLE public.agent_applications ADD COLUMN supporting_documents_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'programme_transition_action') THEN
    ALTER TABLE public.agent_applications ADD COLUMN programme_transition_action text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'is_legacy_application') THEN
    ALTER TABLE public.agent_applications ADD COLUMN is_legacy_application boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'contract_term_months') THEN
    ALTER TABLE public.agent_applications ADD COLUMN contract_term_months integer DEFAULT 12;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_applications' AND column_name = 'opening_order_pieces') THEN
    ALTER TABLE public.agent_applications ADD COLUMN opening_order_pieces integer DEFAULT 1000;
  END IF;
END $$;

-- Preserve and seed the 3 foundational applications if not already inserted
INSERT INTO public.agent_applications (
  application_reference, full_name, email, phone_number, country_code, country_name, city,
  business_name, business_type, website_or_social, business_address, business_registration_number,
  years_of_experience, previous_experience_details, requested_categories, preferred_business_model,
  proposed_territory_details, expected_monthly_sales, estimated_initial_investment, preferred_sales_channels,
  marketing_activities, motivation, status, is_legacy_application, contract_term_months, opening_order_pieces,
  market_entry_plan, first_year_sales_forecast, operating_budget_plan, financial_capacity_statement, team_and_infrastructure,
  terms_accepted, privacy_accepted
) VALUES 
(
  'ABA-2026-NBO94', 'David Mwangi', 'david.mwangi@africandistro.ke', '+254712345678', 'KE', 'Kenya', 'Nairobi',
  'Savannah Streetwear Ltd', 'Existing Fashion Business', 'https://instagram.com/savannahstreetwear', 'Westlands Commercial Hub, Suite 4B, Nairobi', 'CPR/2023/94821',
  '3-5 years', 'Importing and retailing streetwear brands across Nairobi and Mombasa for 4 years.', '["T-Shirt", "Caps", "Footwear"]'::jsonb, 'Country Distributor',
  'Nairobi Metropolis and Coast Region', '150 - 300 units', '$5,000 - $10,000 USD', '["Retail Storefront", "Instagram / WhatsApp Shop", "Pop-up Events"]'::jsonb,
  'Influencer gifting with top Kenyan creators, pop-up events at Westgate and Alchemist.', 'African Boy is the most authentic luxury streetwear brand in East Africa. The demand in Nairobi is immense.',
  'Under Review', false, 12, 1000,
  'Secure premium retail distribution across high-footfall lifestyle spaces in Westlands, Kilimani, and Mombasa.', '1,500 - 2,500 units',
  'USD $18,000 working capital allocated for inventory acquisition and regional marketing.', 'Fully self-funded through existing retail apparel operations with pre-approved letter of credit.', '4 full-time staff, bonded storage facility in Westlands Commercial Hub.',
  true, true
),
(
  'ABA-2026-LOS21', 'Chinedu Okafor', 'chinedu.o@lagosvibe.ng', '+2348039281726', 'NG', 'Nigeria', 'Lagos',
  'Mainland Kicks & Apparel', 'Retail Store', 'https://instagram.com/mainlandkicks', 'Admiralty Way, Lekki Phase 1, Lagos', 'RC-1849204',
  '5+ years', 'Operating physical boutique in Lekki with 40,000+ active customers across Nigeria.', '["T-Shirt", "Caps", "Socks", "Boxer"]'::jsonb, 'Wholesale Reseller',
  'Lekki & Lagos Island', '200 - 500 units', '$10,000+ USD', '["Retail Storefront", "E-commerce Website"]'::jsonb,
  'Collaborating with Afrobeats recording artists, billboards on Lekki-Epe expressway.', 'Jux has massive respect in Nigeria, and the quality of African Boy apparel matches international luxury standards.',
  'Submitted', true, 6, 100,
  'Prominent display in Lekki flagship boutique and online drops targeting Lagos and Abuja fashion consumers.', '1,200 - 2,000 units',
  'USD $15,000 inventory budget from current store reserves.', 'Self-financing with active POS merchant accounts across Nigeria.', '6 sales staff, 2 retail store locations in Lagos.',
  true, true
),
(
  'ABA-2026-LDN07', 'Amina Touré', 'amina@afrocentricuk.com', '+447911123456', 'GB', 'United Kingdom', 'London',
  'Diaspora Drip Ltd', 'Online Seller', 'https://tiktok.com/@diasporadrip', 'Shoreditch High Street, London E1 6JJ', 'UK-CO-1049281',
  '1-3 years', 'TikTok shop and e-commerce selling contemporary African streetwear to the UK diaspora.', '["T-Shirt", "Caps", "Jackets", "Tracksuit"]'::jsonb, 'Commission-Based Agent',
  'Greater London & Online UK', '80 - 150 units', '$2,000 - $5,000 USD', '["Online Store", "TikTok Shop", "Pop-up Markets"]'::jsonb,
  'Showcasing unboxing and styling clips at London African culture festivals.', 'Connecting UK diaspora youth with authentic African pride streetwear.',
  'Submitted', true, 12, 50,
  'Target UK diaspora community via TikTok creator network and summer cultural festivals.', '800 - 1,200 units',
  'GBP £5,000 digital marketing and fulfillment budget.', 'Online business cash flow with active UK Stripe account.', '2 founders, third-party logistics (3PL) fulfillment partner in East London.',
  true, true
)
ON CONFLICT (application_reference) DO NOTHING;
