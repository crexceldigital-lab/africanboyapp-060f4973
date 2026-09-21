-- 1. Packages
CREATE TABLE IF NOT EXISTS public.fitme_credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'TZS',
  badge text,
  is_free boolean NOT NULL DEFAULT false,
  once_per_user boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fitme_credit_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fitme_credit_packages TO authenticated;
GRANT ALL ON public.fitme_credit_packages TO service_role;
ALTER TABLE public.fitme_credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fitme_packages_public_read ON public.fitme_credit_packages;
CREATE POLICY fitme_packages_public_read ON public.fitme_credit_packages
  FOR SELECT USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS fitme_packages_admin_write ON public.fitme_credit_packages;
CREATE POLICY fitme_packages_admin_write ON public.fitme_credit_packages
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.fitme_credit_packages (code, name, credits, price, currency, badge, is_free, once_per_user, sort_order)
VALUES
  ('FREE',    'FREE',             2,      0, 'TZS', NULL,           true,  true,  1),
  ('STARTER', 'STARTER',          5,   5000, 'TZS', NULL,           false, false, 2),
  ('STYLE',   'STYLE PACK',      15,  12000, 'TZS', 'MOST POPULAR', false, false, 3),
  ('PRO',     'AFRICAN BOY PRO', 30,  20000, 'TZS', 'BEST VALUE',   false, false, 4),
  ('VIP',     'VIP',            100,  50000, 'TZS', NULL,           false, false, 5)
ON CONFLICT (code) DO NOTHING;

-- 2. Wallets
CREATE TABLE IF NOT EXISTS public.fitme_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance integer NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  lifetime_credits_purchased integer NOT NULL DEFAULT 0,
  lifetime_credits_used integer NOT NULL DEFAULT 0,
  lifetime_free_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fitme_wallets TO authenticated;
GRANT ALL ON public.fitme_wallets TO service_role;
ALTER TABLE public.fitme_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fitme_wallets_read_own ON public.fitme_wallets;
CREATE POLICY fitme_wallets_read_own ON public.fitme_wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- 3. Credit transactions
CREATE TABLE IF NOT EXISTS public.fitme_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN
    ('FREE_CREDIT','PURCHASE','GENERATION','REFUND','ADMIN_ADJUSTMENT','BONUS')),
  credits integer NOT NULL,
  package_id uuid REFERENCES public.fitme_credit_packages(id) ON DELETE SET NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  payment_reference text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fitme_tx_user_idx ON public.fitme_credit_transactions(user_id, created_at DESC);

GRANT SELECT ON public.fitme_credit_transactions TO authenticated;
GRANT ALL ON public.fitme_credit_transactions TO service_role;
ALTER TABLE public.fitme_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fitme_tx_read_own ON public.fitme_credit_transactions;
CREATE POLICY fitme_tx_read_own ON public.fitme_credit_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- 4. Generations
CREATE TABLE IF NOT EXISTS public.fitme_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  input_hash text NOT NULL,
  credit_transaction_id uuid REFERENCES public.fitme_credit_transactions(id) ON DELETE SET NULL,
  generation_status text NOT NULL DEFAULT 'PENDING' CHECK (generation_status IN
    ('PENDING','PROCESSING','COMPLETED','FAILED','REFUNDED')),
  provider text,
  provider_generation_id text,
  result_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS fitme_gen_user_idx ON public.fitme_generations(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS fitme_gen_cache_idx
  ON public.fitme_generations(user_id, input_hash)
  WHERE generation_status = 'COMPLETED';

GRANT SELECT ON public.fitme_generations TO authenticated;
GRANT ALL ON public.fitme_generations TO service_role;
ALTER TABLE public.fitme_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fitme_gen_read_own ON public.fitme_generations;
CREATE POLICY fitme_gen_read_own ON public.fitme_generations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- 5. Credit purchases
CREATE TABLE IF NOT EXISTS public.fitme_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.fitme_credit_packages(id) ON DELETE SET NULL,
  credits integer NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'TZS',
  payment_reference text UNIQUE,
  checkout_url text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED')),
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fitme_credit_purchases TO authenticated;
GRANT ALL ON public.fitme_credit_purchases TO service_role;
ALTER TABLE public.fitme_credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fitme_purchase_read_own ON public.fitme_credit_purchases;
CREATE POLICY fitme_purchase_read_own ON public.fitme_credit_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.fitme_get_wallet()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pkg public.fitme_credit_packages;
  v_wallet public.fitme_wallets;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('authenticated', false, 'current_balance', 0);
  END IF;

  INSERT INTO public.fitme_wallets (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet FROM public.fitme_wallets WHERE user_id = v_user FOR UPDATE;

  IF v_wallet.lifetime_free_credits = 0 AND NOT EXISTS (
    SELECT 1 FROM public.fitme_credit_transactions
    WHERE user_id = v_user AND transaction_type = 'FREE_CREDIT'
  ) THEN
    SELECT * INTO v_pkg FROM public.fitme_credit_packages
      WHERE code = 'FREE' AND is_active LIMIT 1;

    IF v_pkg.id IS NOT NULL THEN
      INSERT INTO public.fitme_credit_transactions
        (user_id, transaction_type, credits, package_id, description)
      VALUES (v_user, 'FREE_CREDIT', v_pkg.credits, v_pkg.id,
              format('Welcome bonus: %s free Fit Me Credits', v_pkg.credits));

      UPDATE public.fitme_wallets
      SET current_balance = current_balance + v_pkg.credits,
          lifetime_free_credits = lifetime_free_credits + v_pkg.credits,
          updated_at = now()
      WHERE user_id = v_user
      RETURNING * INTO v_wallet;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'user_id', v_wallet.user_id,
    'current_balance', v_wallet.current_balance,
    'lifetime_credits_purchased', v_wallet.lifetime_credits_purchased,
    'lifetime_credits_used', v_wallet.lifetime_credits_used,
    'lifetime_free_credits', v_wallet.lifetime_free_credits
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_get_wallet() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fitme_get_wallet() TO authenticated;

CREATE OR REPLACE FUNCTION public.fitme_reserve_credit(
  p_user_id uuid,
  p_input_hash text,
  p_product_ids jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.fitme_wallets;
  v_cached public.fitme_generations;
  v_tx_id uuid;
  v_gen_id uuid;
  v_first uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO v_cached FROM public.fitme_generations
  WHERE user_id = p_user_id AND input_hash = p_input_hash
    AND generation_status = 'COMPLETED' AND result_url IS NOT NULL
  ORDER BY created_at DESC LIMIT 1;

  IF v_cached.id IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', true, 'cached', true,
      'generation_id', v_cached.id, 'result_url', v_cached.result_url,
      'credits_charged', 0);
  END IF;

  INSERT INTO public.fitme_wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet FROM public.fitme_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_wallet.current_balance < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'insufficient_credits',
      'current_balance', v_wallet.current_balance);
  END IF;

  UPDATE public.fitme_wallets
  SET current_balance = current_balance - 1,
      lifetime_credits_used = lifetime_credits_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_wallet;

  INSERT INTO public.fitme_credit_transactions
    (user_id, transaction_type, credits, description)
  VALUES (p_user_id, 'GENERATION', -1, 'Fit Me AI look generation')
  RETURNING id INTO v_tx_id;

  BEGIN
    v_first := (p_product_ids->>0)::uuid;
  EXCEPTION WHEN others THEN
    v_first := NULL;
  END;

  INSERT INTO public.fitme_generations
    (user_id, product_id, product_ids, input_hash, credit_transaction_id,
     generation_status, provider)
  VALUES (p_user_id, v_first, COALESCE(p_product_ids, '[]'::jsonb), p_input_hash,
          v_tx_id, 'PROCESSING', 'lovable-ai')
  RETURNING id INTO v_gen_id;

  RETURN jsonb_build_object('allowed', true, 'cached', false,
    'generation_id', v_gen_id, 'transaction_id', v_tx_id,
    'credits_charged', 1, 'current_balance', v_wallet.current_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_reserve_credit(uuid, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fitme_reserve_credit(uuid, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.fitme_complete_generation(
  p_generation_id uuid,
  p_result_url text,
  p_provider_generation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fitme_generations
  SET generation_status = 'COMPLETED',
      result_url = p_result_url,
      provider_generation_id = p_provider_generation_id,
      completed_at = now()
  WHERE id = p_generation_id AND generation_status IN ('PENDING','PROCESSING');

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_complete_generation(uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fitme_complete_generation(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fitme_fail_generation(
  p_generation_id uuid,
  p_error text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gen public.fitme_generations;
BEGIN
  SELECT * INTO v_gen FROM public.fitme_generations
  WHERE id = p_generation_id FOR UPDATE;

  IF v_gen.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_gen.generation_status IN ('REFUNDED','FAILED','COMPLETED') THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  UPDATE public.fitme_generations
  SET generation_status = 'REFUNDED',
      error_message = p_error,
      completed_at = now()
  WHERE id = p_generation_id;

  UPDATE public.fitme_wallets
  SET current_balance = current_balance + 1,
      lifetime_credits_used = GREATEST(0, lifetime_credits_used - 1),
      updated_at = now()
  WHERE user_id = v_gen.user_id;

  INSERT INTO public.fitme_credit_transactions
    (user_id, transaction_type, credits, description)
  VALUES (v_gen.user_id, 'REFUND', 1, 'Automatic refund: generation failed');

  RETURN jsonb_build_object('success', true, 'refunded', true);
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_fail_generation(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fitme_fail_generation(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fitme_credit_purchase_paid(
  p_reference text,
  p_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.fitme_credit_purchases;
BEGIN
  SELECT * INTO v_p FROM public.fitme_credit_purchases
  WHERE payment_reference = p_reference FOR UPDATE;

  IF v_p.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'purchase_not_found');
  END IF;

  IF v_p.status = 'PAID' THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  UPDATE public.fitme_credit_purchases
  SET status = 'PAID', credited_at = now(), updated_at = now()
  WHERE id = v_p.id;

  INSERT INTO public.fitme_wallets (user_id) VALUES (v_p.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.fitme_wallets
  SET current_balance = current_balance + v_p.credits,
      lifetime_credits_purchased = lifetime_credits_purchased + v_p.credits,
      updated_at = now()
  WHERE user_id = v_p.user_id;

  INSERT INTO public.fitme_credit_transactions
    (user_id, transaction_type, credits, package_id, amount_paid, currency,
     payment_reference, description)
  VALUES (v_p.user_id, 'PURCHASE', v_p.credits, v_p.package_id, v_p.amount,
          v_p.currency, p_reference, 'Fit Me Credits purchase');

  RETURN jsonb_build_object('success', true, 'credits', v_p.credits);
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_credit_purchase_paid(text, numeric) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fitme_credit_purchase_paid(text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.fitme_credit_purchase_failed(
  p_reference text,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fitme_credit_purchases
  SET status = CASE WHEN p_status = 'cancelled' THEN 'CANCELLED' ELSE 'FAILED' END,
      updated_at = now()
  WHERE payment_reference = p_reference AND status = 'PENDING';
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_credit_purchase_failed(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fitme_credit_purchase_failed(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fitme_admin_adjust_credits(
  p_user_id uuid,
  p_credits integer,
  p_description text DEFAULT NULL,
  p_transaction_type text DEFAULT 'ADMIN_ADJUSTMENT'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.fitme_wallets;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  IF p_credits = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_change');
  END IF;

  IF p_transaction_type NOT IN ('ADMIN_ADJUSTMENT','BONUS','REFUND') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  INSERT INTO public.fitme_wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet FROM public.fitme_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF p_credits < 0 AND v_wallet.current_balance + p_credits < 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'would_go_negative',
      'current_balance', v_wallet.current_balance);
  END IF;

  UPDATE public.fitme_wallets
  SET current_balance = current_balance + p_credits, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_wallet;

  INSERT INTO public.fitme_credit_transactions
    (user_id, transaction_type, credits, description)
  VALUES (p_user_id, p_transaction_type, p_credits,
          COALESCE(p_description, 'Admin adjustment'));

  RETURN jsonb_build_object('success', true, 'current_balance', v_wallet.current_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_admin_adjust_credits(uuid, integer, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fitme_admin_adjust_credits(uuid, integer, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fitme_admin_stats(p_unit_cost numeric DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  v_success integer;
  v_revenue numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT COUNT(*) FILTER (WHERE generation_status = 'COMPLETED') INTO v_success
  FROM public.fitme_generations;

  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM public.fitme_credit_purchases WHERE status = 'PAID';

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.fitme_wallets),
    'credits_purchased', (SELECT COALESCE(SUM(lifetime_credits_purchased),0) FROM public.fitme_wallets),
    'credits_used', (SELECT COALESCE(SUM(lifetime_credits_used),0) FROM public.fitme_wallets),
    'credits_refunded', (SELECT COALESCE(SUM(credits),0) FROM public.fitme_credit_transactions WHERE transaction_type = 'REFUND'),
    'free_credits_issued', (SELECT COALESCE(SUM(lifetime_free_credits),0) FROM public.fitme_wallets),
    'revenue', v_revenue,
    'generations', (SELECT COUNT(*) FROM public.fitme_generations),
    'generations_success', v_success,
    'generations_failed', (SELECT COUNT(*) FROM public.fitme_generations WHERE generation_status IN ('FAILED','REFUNDED')),
    'estimated_ai_cost', v_success * COALESCE(p_unit_cost, 0),
    'estimated_gross_margin', v_revenue - (v_success * COALESCE(p_unit_cost, 0))
  ) INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_admin_stats(numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fitme_admin_stats(numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fitme_admin_users(p_query text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  phone_number text,
  current_balance integer,
  lifetime_credits_purchased integer,
  lifetime_credits_used integer,
  lifetime_free_credits integer,
  generations bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.phone_number,
         COALESCE(w.current_balance, 0),
         COALESCE(w.lifetime_credits_purchased, 0),
         COALESCE(w.lifetime_credits_used, 0),
         COALESCE(w.lifetime_free_credits, 0),
         (SELECT COUNT(*) FROM public.fitme_generations g WHERE g.user_id = p.id)
  FROM public.profiles p
  LEFT JOIN public.fitme_wallets w ON w.user_id = p.id
  WHERE p_query IS NULL OR p_query = ''
     OR p.full_name ILIKE '%' || p_query || '%'
     OR p.phone_number ILIKE '%' || p_query || '%'
  ORDER BY COALESCE(w.updated_at, p.created_at) DESC NULLS LAST
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.fitme_admin_users(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fitme_admin_users(text) TO authenticated, service_role;