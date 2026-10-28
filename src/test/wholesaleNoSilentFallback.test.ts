import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../integrations/supabase/client';
import { wholesaleProgramService } from '../services/wholesaleProgramService';

const input = {
  fullName: 'Test Buyer', businessEmail: 'b@x.com', phoneNumber: '+255712345678', country: 'Tanzania',
  businessName: 'Biz', businessType: 'Boutique', estimatedOrderQuantity: '500-999', consentAcknowledged: true,
} as any;

describe('wholesale data never silently falls back to local copies', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('strict settings load throws instead of returning cached/default prices', async () => {
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: 'network' } }) }) }),
    } as any);
    await expect(wholesaleProgramService.getSettings({ strict: true })).rejects.toBeTruthy();
  });

  it('enquiry failure surfaces an error and creates no local-only token', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'down' } } as any);
    const fromSpy = vi.spyOn(supabase, 'from');
    await expect(wholesaleProgramService.submitPricingEnquiry(input)).rejects.toThrow(/could not submit/i);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(wholesaleProgramService.getActivePricingToken()).toBeFalsy();
  });

  it('slow but successful RPC is still accepted', async () => {
    vi.spyOn(supabase, 'rpc').mockImplementation((() => new Promise(r => setTimeout(() => r({
      data: { access_token: 'tok-server', enquiry_reference: 'WPE-2026-12345', access_token_expires_at: new Date().toISOString() }, error: null,
    }), 800))) as any);
    const res = await wholesaleProgramService.submitPricingEnquiry(input);
    expect(res.enquiryReference).toBe('WPE-2026-12345');
    expect(res.accessToken).toBe('tok-server');
  });
});
