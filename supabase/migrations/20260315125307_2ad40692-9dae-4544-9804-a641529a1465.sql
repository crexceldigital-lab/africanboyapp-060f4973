
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  delivery_zone text,
  payment_reference text,
  payment_method text,
  snippe_checkout_url text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_name text,
  customer_email text,
  customer_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
