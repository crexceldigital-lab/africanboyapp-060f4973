CREATE TABLE public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_reference text NOT NULL UNIQUE,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  country_code text NOT NULL,
  country_name text NOT NULL,
  city text NOT NULL,
  preferred_language text,
  business_name text,
  business_type text,
  website_or_social text,
  business_address text,
  business_registration_number text,
  years_of_experience text,
  previous_experience_details text,
  requested_categories jsonb,
  preferred_business_model text,
  proposed_territory_details text,
  expected_monthly_sales text,
  estimated_initial_investment text,
  preferred_sales_channels jsonb,
  marketing_activities text,
  motivation text,
  status text NOT NULL DEFAULT 'Submitted',
  internal_notes text,
  admin_feedback_to_applicant text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  terms_accepted boolean NOT NULL DEFAULT false,
  privacy_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.agent_applications TO anon, authenticated;
GRANT SELECT, UPDATE ON public.agent_applications TO authenticated;
GRANT ALL ON public.agent_applications TO service_role;
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an application" ON public.agent_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read applications" ON public.agent_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update applications" ON public.agent_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Applicants can read own application" ON public.agent_applications FOR SELECT TO authenticated USING (user_id = auth.uid());