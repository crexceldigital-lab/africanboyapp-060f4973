-- Admins/staff update order status through the client; RLS policies already
-- restrict who may update or delete. The missing table-level grant caused
-- "permission denied for table orders".
GRANT UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;