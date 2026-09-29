CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public settings readable" ON public.app_settings FOR SELECT USING (is_public OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.app_settings(key,value,is_public) VALUES ('intl_whatsapp_number','',true) ON CONFLICT DO NOTHING;

CREATE TABLE public.international_order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE,
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  address text,
  postcode text,
  cart_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  shipping_cost numeric,
  shipping_currency text,
  final_total numeric,
  final_currency text,
  shipping_provider text,
  estimated_delivery text,
  shipping_notes text,
  fulfillment_location text,
  status text NOT NULL DEFAULT 'REQUESTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intl_status_chk CHECK (status IN ('REQUESTED','STOCK_CHECK','SHIPPING_QUOTE','AWAITING_CUSTOMER','PAYMENT_PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
  CONSTRAINT intl_loc_chk CHECK (fulfillment_location IS NULL OR fulfillment_location IN ('TANZANIA','NIGERIA'))
);
GRANT SELECT, UPDATE ON public.international_order_requests TO authenticated;
GRANT ALL ON public.international_order_requests TO service_role;
ALTER TABLE public.international_order_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own intl requests" ON public.international_order_requests FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update intl requests" ON public.international_order_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_intl_updated BEFORE UPDATE ON public.international_order_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create request: prices recalculated from products table
CREATE OR REPLACE FUNCTION public.create_international_request(p_customer_name text, p_customer_email text, p_customer_phone text, p_country text, p_city text, p_address text, p_postcode text, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item jsonb; v_prod record; v_qty int; v_unit numeric; v_items jsonb := '[]'::jsonb; v_total numeric := 0;
  v_ref text; v_row record; v_tries int := 0;
BEGIN
  IF coalesce(length(trim(p_customer_name)),0) < 2 OR length(p_customer_name) > 100 THEN RAISE EXCEPTION 'Please enter your name'; END IF;
  IF coalesce(length(trim(p_customer_phone)),0) < 6 OR length(p_customer_phone) > 30 THEN RAISE EXCEPTION 'Please enter a valid WhatsApp / phone number'; END IF;
  IF coalesce(length(trim(p_country)),0) < 2 OR length(p_country) > 80 THEN RAISE EXCEPTION 'Please enter your country'; END IF;
  IF coalesce(length(trim(p_city)),0) < 1 OR length(p_city) > 80 THEN RAISE EXCEPTION 'Please enter your city'; END IF;
  IF length(coalesce(p_address,'')) > 300 OR length(coalesce(p_postcode,'')) > 20 OR length(coalesce(p_customer_email,'')) > 255 THEN RAISE EXCEPTION 'Some details are too long'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'Your cart is empty'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := greatest(1, least(99, coalesce((v_item->>'quantity')::int, 1)));
    SELECT id, name, sku, price, sale_price, on_sale, image_url INTO v_prod FROM products WHERE id::text = v_item->>'product_id' AND status <> 'deleted';
    IF NOT FOUND THEN RAISE EXCEPTION 'A product in your cart is no longer available'; END IF;
    v_unit := CASE WHEN v_prod.on_sale AND v_prod.sale_price IS NOT NULL AND v_prod.sale_price > 0 THEN v_prod.sale_price ELSE v_prod.price END;
    v_items := v_items || jsonb_build_object(
      'product_id', v_prod.id, 'product_name', v_prod.name, 'sku', v_prod.sku,
      'variant_id', concat_ws('-', v_prod.id::text, nullif(v_item->>'size',''), nullif(v_item->>'colour','')),
      'size', nullif(left(v_item->>'size',20),''), 'colour', nullif(left(v_item->>'colour',40),''),
      'quantity', v_qty, 'unit_price', v_unit, 'total_price', v_unit * v_qty, 'product_image', v_prod.image_url);
    v_total := v_total + v_unit * v_qty;
  END LOOP;

  LOOP
    v_ref := 'AFB-INT-' || lpad((floor(random()*90000)+10000)::int::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM international_order_requests WHERE reference_number = v_ref);
    v_tries := v_tries + 1; IF v_tries > 20 THEN RAISE EXCEPTION 'Please try again'; END IF;
  END LOOP;

  INSERT INTO international_order_requests(reference_number, customer_id, customer_name, customer_email, customer_phone, country, city, address, postcode, cart_items, product_total, currency)
  VALUES (v_ref, auth.uid(), trim(p_customer_name), nullif(trim(coalesce(p_customer_email,'')),''), trim(p_customer_phone), trim(p_country), trim(p_city), nullif(trim(coalesce(p_address,'')),''), nullif(trim(coalesce(p_postcode,'')),''), v_items, v_total, 'TZS')
  RETURNING reference_number, access_token, product_total, cart_items INTO v_row;

  RETURN jsonb_build_object('reference_number', v_row.reference_number, 'access_token', v_row.access_token, 'product_total', v_row.product_total, 'cart_items', v_row.cart_items);
END $$;
GRANT EXECUTE ON FUNCTION public.create_international_request(text,text,text,text,text,text,text,jsonb) TO anon, authenticated;

-- Customer-safe view (owner or private link)
CREATE OR REPLACE FUNCTION public.get_international_request(p_reference text, p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('reference_number', reference_number, 'customer_name', customer_name, 'country', country, 'city', city,
    'cart_items', (SELECT coalesce(jsonb_agg(e - 'product_id' - 'variant_id'), '[]'::jsonb) FROM jsonb_array_elements(cart_items) e),
    'product_total', product_total, 'currency', currency, 'shipping_cost', shipping_cost, 'shipping_currency', shipping_currency,
    'final_total', final_total, 'final_currency', final_currency, 'shipping_provider', shipping_provider,
    'estimated_delivery', estimated_delivery, 'shipping_notes', shipping_notes, 'status', status, 'created_at', created_at)
  FROM international_order_requests
  WHERE reference_number = p_reference AND ((p_token IS NOT NULL AND access_token = p_token) OR (auth.uid() IS NOT NULL AND customer_id = auth.uid()))
$$;
GRANT EXECUTE ON FUNCTION public.get_international_request(text,uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.respond_international_quote(p_reference text, p_token uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  UPDATE international_order_requests
     SET status = CASE WHEN p_accept THEN 'PAYMENT_PENDING' ELSE 'CANCELLED' END
   WHERE reference_number = p_reference
     AND status IN ('SHIPPING_QUOTE','AWAITING_CUSTOMER')
     AND ((p_token IS NOT NULL AND access_token = p_token) OR (auth.uid() IS NOT NULL AND customer_id = auth.uid()))
  RETURNING status INTO v_status;
  IF v_status IS NULL THEN RAISE EXCEPTION 'This quote can no longer be changed'; END IF;
  RETURN jsonb_build_object('status', v_status);
END $$;
GRANT EXECUTE ON FUNCTION public.respond_international_quote(text,uuid,boolean) TO anon, authenticated;