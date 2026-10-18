-- Drizzle Migration: Country Distributor Programme Transition
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
