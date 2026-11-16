import { describe, it, expect, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { PRODUCT_PUBLIC_COLUMNS, fetchProductCostMap } from '@/lib/productColumns';

describe('purchasing price is Admin-only', () => {
  it('public product columns never include the purchasing price', () => {
    expect(PRODUCT_PUBLIC_COLUMNS.split(',')).not.toContain('cost_price');
  });

  it('non-admins get no purchasing prices when the server refuses', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Not authorized' } });
    expect(await fetchProductCostMap()).toEqual({});
  });

  it('admins get purchasing prices by product', async () => {
    rpc.mockResolvedValueOnce({ data: [{ product_id: 'p1', cost_price: '16000' }], error: null });
    expect(await fetchProductCostMap()).toEqual({ p1: 16000 });
  });
});
