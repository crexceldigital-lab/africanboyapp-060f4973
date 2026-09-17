-- Migration: Preserve Product Stock Integrity & Disable Automatic Overwrites
-- Ensures products.stock_quantity remains the master inventory count and is never overwritten during data resets.

-- 1. Drop trigger if it exists on product_store_availability to prevent overwriting master product stock_quantity
DROP TRIGGER IF EXISTS trg_sync_product_total_stock ON public.product_store_availability;
DROP FUNCTION IF EXISTS public.sync_product_total_stock();

-- 2. Clean reset function for test transactions (Orders, Order Items, Payments, Transactions ONLY)
CREATE OR REPLACE FUNCTION public.reset_test_transaction_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    DELETE FROM public.orders;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
    DELETE FROM public.order_items;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    DELETE FROM public.payments;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    DELETE FROM public.transactions;
  END IF;

  -- CRITICAL REQUIREMENT: products.stock_quantity is intentionally untouched!
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_test_transaction_data() TO authenticated;
