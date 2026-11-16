import { supabase } from '@/integrations/supabase/client';

/**
 * Product columns readable by everyone. Purchasing price (cost_price) is
 * deliberately excluded: the database only lets Admins read it, through
 * fetchProductCostMap().
 */
export const PRODUCT_PUBLIC_COLUMNS =
  'id,name,price,category,image_url,description,stock_quantity,sizes,colors,created_at,updated_at,sku,subcategory,sale_price,on_sale,discount_percent,stock,status';

/** Admin-only: product id -> purchasing price. Returns {} for non-admins. */
export async function fetchProductCostMap(): Promise<Record<string, number>> {
  const { data, error } = await (supabase.rpc as any)('admin_get_product_costs');
  if (error || !Array.isArray(data)) {
    if (error) console.warn('Could not load purchasing prices:', error.message);
    return {};
  }
  const map: Record<string, number> = {};
  for (const row of data as { product_id: string; cost_price: number | string | null }[]) {
    map[row.product_id] = Number(row.cost_price) || 0;
  }
  return map;
}
