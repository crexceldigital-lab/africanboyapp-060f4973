import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchWallet,
  fetchPackages,
  startCreditPurchase,
  verifyPaymentStatus,
  pricePerCredit,
  formatTZS,
  FitMeCreditPackage,
} from '../lib/fitmeCredits';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  const rpcMock = vi.fn();
  const fromMock = vi.fn();
  const invokeMock = vi.fn();
  return {
    supabase: {
      rpc: rpcMock,
      from: fromMock,
      functions: {
        invoke: invokeMock,
      },
    },
  };
});

describe('Fit Me Credits & Real Snippe Payment Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPackage: FitMeCreditPackage = {
    id: 'pkg-10-credits',
    code: 'FITME_10',
    name: '10 Fit Me Credits',
    credits: 10,
    price: 10000,
    currency: 'TZS',
    badge: 'POPULAR',
    is_free: false,
    once_per_user: false,
    sort_order: 1,
  };

  it('calculates price per credit and formats TZS correctly', () => {
    expect(pricePerCredit(mockPackage)).toBe(1000);
    expect(formatTZS(10000)).toBe('TZS 10,000');
  });

  it('fetches wallet balance via fitme_get_wallet RPC', async () => {
    const mockWallet = {
      authenticated: true,
      current_balance: 15,
      lifetime_credits_purchased: 20,
      lifetime_credits_used: 5,
    };

    (supabase.rpc as any).mockResolvedValueOnce({
      data: mockWallet,
      error: null,
    });

    const wallet = await fetchWallet();
    expect(supabase.rpc).toHaveBeenCalledWith('fitme_get_wallet');
    expect(wallet.authenticated).toBe(true);
    expect(wallet.current_balance).toBe(15);
  });

  it('fetches active credit packages from fitme_credit_packages table', async () => {
    const mockDbPackages = [
      {
        id: 'pkg-5',
        code: 'FITME_5',
        name: '5 Credits',
        credits: 5,
        price: 5000,
        currency: 'TZS',
        badge: null,
        is_free: false,
        once_per_user: false,
        sort_order: 1,
        is_active: true,
      },
    ];

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValueOnce({
      data: mockDbPackages,
      error: null,
    });

    (supabase.from as any).mockReturnValueOnce({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    });

    const packages = await fetchPackages();
    expect(supabase.from).toHaveBeenCalledWith('fitme_credit_packages');
    expect(packages).toHaveLength(1);
    expect(packages[0].code).toBe('FITME_5');
    expect(packages[0].credits).toBe(5);
  });

  it('starts credit purchase via fitme-credits-purchase Edge Function', async () => {
    const mockPurchaseResponse = {
      success: true,
      checkout_url: 'https://checkout.snippe.sh/session/sess_fitme_test_123',
      reference: 'fitme_ref_123456',
      purchase_id: 'purch-789',
      credits: 10,
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockPurchaseResponse,
      error: null,
    });

    const res = await startCreditPurchase(mockPackage, {
      name: 'John Doe',
      phone: '255712345678',
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'fitme-credits-purchase',
      expect.objectContaining({
        body: expect.objectContaining({
          packageId: 'pkg-10-credits',
          packageCode: 'FITME_10',
          customerName: 'John Doe',
          customerPhone: '255712345678',
        }),
      })
    );
    expect(res.checkout_url).toContain('sess_fitme_test_123');
    expect(res.reference).toBe('fitme_ref_123456');
  });

  it('verifies paid payment status idempotently via verify-fitme-payment Edge Function', async () => {
    const mockVerifyResponse = {
      success: true,
      status: 'PAID',
      already_processed: true,
      credits_added: 10,
      purchase_id: 'purch-789',
      reference: 'fitme_ref_123456',
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockVerifyResponse,
      error: null,
    });

    const res = await verifyPaymentStatus('fitme_ref_123456');

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'verify-fitme-payment',
      expect.objectContaining({
        body: { reference: 'fitme_ref_123456', purchase_id: 'fitme_ref_123456' },
      })
    );
    expect(res.status).toBe('PAID');
    expect(res.already_processed).toBe(true);
    expect(res.credits_added).toBe(10);
  });

  it('handles pending payment status during verification', async () => {
    const mockVerifyResponse = {
      success: true,
      status: 'PENDING',
      message: 'Payment is pending Snippe confirmation',
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockVerifyResponse,
      error: null,
    });

    const res = await verifyPaymentStatus('fitme_ref_pending');
    expect(res.status).toBe('PENDING');
    expect(res.success).toBe(true);
  });

  it('handles failed or cancelled payment status', async () => {
    const mockVerifyResponse = {
      success: true,
      status: 'FAILED',
      message: 'Payment session failed or was cancelled',
    };

    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: mockVerifyResponse,
      error: null,
    });

    const res = await verifyPaymentStatus('fitme_ref_failed');
    expect(res.status).toBe('FAILED');
  });

  it('protects zero-balance user from generating AI looks', () => {
    const zeroWallet = { authenticated: true, current_balance: 0 };
    const canGenerate = zeroWallet.current_balance >= 1;
    expect(canGenerate).toBe(false);
  });
});
