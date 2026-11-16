-- Distributor collection orders: enable RLS with admin + own-applicant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_collection_orders TO authenticated;
GRANT ALL ON public.distributor_collection_orders TO service_role;
ALTER TABLE public.distributor_collection_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage collection tracking" ON public.distributor_collection_orders;
CREATE POLICY "Admins manage collection tracking" ON public.distributor_collection_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Applicants view own collection tracking" ON public.distributor_collection_orders;
CREATE POLICY "Applicants view own collection tracking" ON public.distributor_collection_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_applications a
      WHERE a.id = distributor_collection_orders.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Invoice settings: remove public read, restrict to admins and assigned active staff
DROP POLICY IF EXISTS "Invoice settings readable by all authenticated and anon" ON public.invoice_settings;
REVOKE ALL ON public.invoice_settings FROM anon;

CREATE POLICY "Admins and store staff read invoice settings" ON public.invoice_settings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.store_staff s
      WHERE s.user_id = auth.uid()
        AND s.store_id = invoice_settings.store_id
        AND s.status = 'active'
    )
  );

-- Letterhead-only business details for agent proposal/agreement PDFs (no bank/tax fields)
CREATE OR REPLACE FUNCTION public.get_business_letterhead()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.store_staff s WHERE s.user_id = v_uid AND s.status = 'active')
    OR EXISTS (SELECT 1 FROM public.agent_applications a WHERE a.user_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'business_name', business_name,
    'business_address', business_address,
    'city', city,
    'country', country,
    'email', email,
    'phone', phone,
    'website', website,
    'contact_person', contact_person
  ) INTO v_result
  FROM public.invoice_settings
  WHERE store_id = 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_letterhead() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_letterhead() TO authenticated;