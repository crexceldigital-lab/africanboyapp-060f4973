-- Create invoice_settings table for store-scoped company and billing details
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id integer NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT 'AfricanBoy International Ltd',
  trading_name text DEFAULT 'AfricanBoy Apparel & Merchandise',
  business_address text DEFAULT 'Kariakoo Commercial District, Msimbazi Street',
  city text DEFAULT 'Dar es Salaam',
  country text DEFAULT 'Tanzania',
  phone text DEFAULT '+255 700 000 000',
  email text DEFAULT 'billing@africanboy.com',
  website text DEFAULT 'https://africanboy.com',
  tin_number text DEFAULT '123-456-789',
  vrn_number text DEFAULT 'VRN-40019284',
  registration_number text DEFAULT 'TZ-REG-2026-9482',
  bank_name text DEFAULT 'CRDB Bank',
  account_name text DEFAULT 'AfricanBoy International Co. Ltd',
  account_number text DEFAULT '0150294829100',
  bank_branch text DEFAULT 'Kariakoo Branch, Dar es Salaam',
  swift_code text DEFAULT 'CORUTZTZ',
  payment_instructions text DEFAULT 'Pay via CRDB Bank or M-Pesa Till Number: 8849201. Please include Invoice # as reference.',
  invoice_prefix text DEFAULT 'AFB-INV',
  default_currency text DEFAULT 'TZS',
  payment_terms text DEFAULT 'Payment due within 14 days of invoice issue.',
  due_days integer DEFAULT 14,
  invoice_notes text DEFAULT 'Thank you for shopping with AfricanBoy! Keep this invoice for official accounting records.',
  footer_text text DEFAULT 'AfricanBoy Official Commercial Invoice • All rights reserved.',
  contact_person text DEFAULT 'Finance & Billing Desk',
  contact_phone text DEFAULT '+255 700 000 000',
  contact_email text DEFAULT 'finance@africanboy.com',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_settings_store_id_unique UNIQUE (store_id)
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.invoice_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.invoice_settings TO authenticated;
GRANT ALL ON public.invoice_settings TO service_role;

-- RLS Policies
-- Everyone can read invoice settings (store public billing info for generated invoices)
CREATE POLICY "Invoice settings readable by all authenticated and anon"
  ON public.invoice_settings FOR SELECT
  USING (true);

-- Only Admins or Store Managers can insert/update/delete invoice settings
CREATE POLICY "Admins and managers update invoice settings"
  ON public.invoice_settings FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE user_id = auth.uid()
        AND store_id = invoice_settings.store_id
        AND staff_role IN ('store_manager', 'admin')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE user_id = auth.uid()
        AND store_id = invoice_settings.store_id
        AND staff_role IN ('store_manager', 'admin')
    )
  );

-- Seed initial default settings for store 1 (AfricanBoy Tanzania)
INSERT INTO public.invoice_settings (store_id, business_name, trading_name, tin_number, bank_name, account_name, account_number, bank_branch, payment_instructions)
VALUES (
  1,
  'AfricanBoy International Ltd',
  'AfricanBoy Apparel & Merchandise',
  '123-456-789',
  'CRDB Bank',
  'AfricanBoy International Co. Ltd',
  '0150294829100',
  'Kariakoo Branch, Dar es Salaam',
  'Pay via CRDB Bank or M-Pesa Till Number: 8849201. Please include Invoice # as reference.'
)
ON CONFLICT (store_id) DO NOTHING;
