import { describe, it, expect, vi } from 'vitest';

const backend = vi.hoisted(() => ({ error: null as { message: string } | null, row: null as any }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = {
    upsert: vi.fn((row: unknown) => { backend.row = row; return chain; }),
    select: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: backend.error ? null : backend.row, error: backend.error })),
  };
  return { supabase: { from: vi.fn(() => chain) } };
});

import { wholesaleProgramService } from '@/services/wholesaleProgramService';

describe('Confirmed proposal persistence', () => {
  it('returns the saved offer with goods-only recalculated totals', async () => {
    backend.error = null;
    const offer = await wholesaleProgramService.saveOffer({
      applicationId: '7da4d554-9464-484b-86ef-ce62458193b3', currency: 'USD',
      merchandiseSubtotal: 1, confirmedShippingRate: 500,
      proposedItems: [{ productId: 'tee', name: 'Tee', sku: 'AFB-TEE-PND-BLK', category: 'T-Shirt', quantity: 30, unitPrice: 13.30, lineTotal: 1, retailPrice: 0, appliedTierLabel: '' }],
    });
    expect(offer.merchandiseSubtotal).toBe(399);
    expect(offer.totalUnits).toBe(30);
    expect(offer.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
  it('fails rather than reporting a saved offer when the database rejects the write', async () => {
    backend.error = { message: 'permission denied' };
    await expect(wholesaleProgramService.saveOffer({ applicationId: 'app', currency: 'USD', proposedItems: [] })).rejects.toThrow('permission denied');
  });
});