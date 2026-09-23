import { supabase } from '@/integrations/supabase/client';

export interface FitMeWallet {
  authenticated: boolean;
  current_balance: number;
  lifetime_credits_purchased?: number;
  lifetime_credits_used?: number;
  lifetime_free_credits?: number;
}

export interface FitMeCreditPackage {
  id: string;
  code: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  badge: string | null;
  is_free: boolean;
  once_per_user: boolean;
  sort_order: number;
}

/**
 * The wallet balance is always read from the server (never derived in the browser).
 * The first call for a new account also issues the one-time free credits.
 */
export async function fetchWallet(): Promise<FitMeWallet> {
  const { data, error } = await (supabase as any).rpc('fitme_get_wallet');
  if (error || !data) return { authenticated: false, current_balance: 0 };
  return data as FitMeWallet;
}

/** Packages come from the database, so prices and credit counts are editable without code changes. */
export async function fetchPackages(): Promise<FitMeCreditPackage[]> {
  const { data, error } = await (supabase as any)
    .from('fitme_credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return (data as any[]).map((p) => ({
    ...p,
    credits: Number(p.credits),
    price: Number(p.price),
  })) as FitMeCreditPackage[];
}

export async function startCreditPurchase(pkg: FitMeCreditPackage, customer: { name?: string; phone?: string }) {
  const { data, error } = await supabase.functions.invoke('fitme-credits-purchase', {
    body: {
      packageId: pkg.id,
      packageCode: pkg.code,
      customerName: customer.name || '',
      customerPhone: customer.phone || '',
      redirectUrl: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });

  if (error) throw new Error(error.message || 'Could not start the payment.');
  if (!data?.success) throw new Error(data?.error || 'Could not start the payment.');
  return data as { checkout_url: string; reference: string; purchase_id: string; credits: number };
}

export function pricePerCredit(pkg: FitMeCreditPackage) {
  if (!pkg.credits) return 0;
  return Math.round(Number(pkg.price) / pkg.credits);
}

export function formatTZS(amount: number) {
  return `TZS ${Math.round(amount).toLocaleString('en-US')}`;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'UNKNOWN';
  already_processed?: boolean;
  purchase_id?: string;
  reference?: string;
  credits_added?: number;
  message?: string;
  error?: string;
}

export async function verifyPaymentStatus(referenceOrPurchaseId: string): Promise<VerifyPaymentResult> {
  const { data, error } = await supabase.functions.invoke('verify-fitme-payment', {
    body: { reference: referenceOrPurchaseId, purchase_id: referenceOrPurchaseId },
  });

  if (error) {
    return { success: false, status: 'UNKNOWN', error: error.message || 'Verification request failed' };
  }
  return data as VerifyPaymentResult;
}
