-- 1) Harden handle_new_user_setup: derive identity from the JWT, not client input
DROP FUNCTION IF EXISTS public.handle_new_user_setup(uuid, text, text);

CREATE OR REPLACE FUNCTION public.handle_new_user_setup(p_full_name text DEFAULT ''::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, full_name)
  values (v_user_id, coalesce(p_full_name, ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'user')
  on conflict (user_id, role) do nothing;

  if v_email = 'africanboy.admin@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (v_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
end;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user_setup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user_setup(text) TO authenticated;

-- 2) has_role is only for use inside policies/functions: no direct API access
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 3) Orders: customers must not be able to modify their orders
DROP POLICY IF EXISTS "Service role can update orders" ON public.orders;
REVOKE UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE UPDATE, DELETE ON public.orders FROM anon;
GRANT ALL ON public.orders TO service_role;

-- 4) user_roles: explicitly deny all client-side writes
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "No client inserts on user_roles" ON public.user_roles;
CREATE POLICY "No client inserts on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates on user_roles" ON public.user_roles;
CREATE POLICY "No client updates on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on user_roles" ON public.user_roles;
CREATE POLICY "No client deletes on user_roles"
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);