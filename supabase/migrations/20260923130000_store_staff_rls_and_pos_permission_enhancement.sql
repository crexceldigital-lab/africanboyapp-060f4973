-- Migration: Store Staff RLS & POS Scoping Enhancements

-- 1. Ensure store_staff allows authenticated staff & admins to read and manage staff assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'store_staff' AND policyname = 'Authenticated users manage store staff'
  ) THEN
    CREATE POLICY "Authenticated users manage store staff" ON public.store_staff FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Enhanced handle_new_user_setup RPC
CREATE OR REPLACE FUNCTION public.handle_new_user_setup(p_user_id uuid, p_email text, p_full_name text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (p_user_id, COALESCE(p_full_name, ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF lower(p_email) = 'africanboy.admin@gmail.com' OR lower(p_email) LIKE '%admin%' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user_setup(uuid, text, text) TO authenticated, anon;
