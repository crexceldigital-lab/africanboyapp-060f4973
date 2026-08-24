-- Migration: Location-Based Currency Tables & Seeding

CREATE TABLE IF NOT EXISTS public.countries (
  id serial PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,        -- ISO 3166-1 alpha-2, e.g. 'TZ'
  currency_code text NOT NULL,      -- ISO 4217, e.g. 'TZS'
  currency_symbol text NOT NULL,
  flag_emoji text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id serial PRIMARY KEY,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency)
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'countries' AND policyname = 'Anyone can read countries') THEN
    CREATE POLICY "Anyone can read countries" ON public.countries FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'countries' AND policyname = 'Admins can manage countries') THEN
    CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_rates' AND policyname = 'Anyone can read exchange rates') THEN
    CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rates FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_rates' AND policyname = 'Admins can manage exchange rates') THEN
    CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

INSERT INTO public.countries (name, code, currency_code, currency_symbol, flag_emoji) VALUES
  ('Tanzania', 'TZ', 'TZS', 'TSh', '🇹🇿'),
  ('Nigeria', 'NG', 'NGN', '₦', '🇳🇬'),
  ('Kenya', 'KE', 'KES', 'KSh', '🇰🇪'),
  ('Uganda', 'UG', 'UGX', 'USh', '🇺🇬'),
  ('South Africa', 'ZA', 'ZAR', 'R', '🇿🇦'),
  ('United States', 'US', 'USD', '$', '🇺🇸'),
  ('United Kingdom', 'GB', 'GBP', '£', '🇬🇧'),
  ('United Arab Emirates', 'AE', 'AED', 'AED', '🇦🇪')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES
  ('TZS', 'TZS', 1),
  ('TZS', 'NGN', 0.65),
  ('TZS', 'KES', 0.051),
  ('TZS', 'UGX', 1.45),
  ('TZS', 'ZAR', 0.0071),
  ('TZS', 'USD', 0.00039),
  ('TZS', 'GBP', 0.00030),
  ('TZS', 'AED', 0.0014)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();
