ALTER TABLE public.store_staff
ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.store_staff
SET permissions = CASE
  WHEN staff_role = 'store_manager' THEN '["pos_sale", "void_sale", "create_shipment"]'::jsonb
  WHEN staff_role = 'sales_rep' THEN '["pos_sale"]'::jsonb
  ELSE COALESCE(permissions, '[]'::jsonb)
END
WHERE permissions = '[]'::jsonb OR permissions IS NULL;

COMMENT ON COLUMN public.store_staff.permissions IS 'Allowed store operations for this staff assignment, such as pos_sale, void_sale, and create_shipment.';