-- Purchasing price (cost_price) must be readable by Admins only.
REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (id, name, price, category, image_url, description, stock_quantity, sizes, colors,
  created_at, updated_at, sku, subcategory, sale_price, on_sale, discount_percent, stock, status)
  ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_product_costs()
RETURNS TABLE(product_id uuid, cost_price numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT p.id, p.cost_price FROM public.products p;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_product_costs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_product_costs() TO authenticated;