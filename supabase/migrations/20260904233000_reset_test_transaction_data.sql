-- Migration: Reset Test Transaction Data & Restore Production Baseline

-- 1. Truncate test transaction & order tables safely
DO $$
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
END $$;

-- 2. Product inventory is intentionally left untouched.
-- A previous version of this migration forced stock_quantity up to 50 for every
-- product, which hid genuinely sold-out items. Resetting test transactions must
-- never modify inventory.

-- 3. Verify user profiles & roles are preserved
-- (Profiles, user_roles, products, stores, store_staff, gallery items are untouched)
