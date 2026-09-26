import { supabase } from '@/integrations/supabase/client';

export const INTL_STATUSES = [
  'REQUESTED', 'STOCK_CHECK', 'SHIPPING_QUOTE', 'AWAITING_CUSTOMER', 'PAYMENT_PENDING',
  'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED',
] as const;
export type IntlStatus = typeof INTL_STATUSES[number];

export const INTL_LOCATIONS = [
  { value: 'TANZANIA', label: '🇹🇿 Tanzania' },
  { value: 'NIGERIA', label: '🇳🇬 Nigeria' },
] as const;

export function statusLabel(s: string) {
  return s.toLowerCase().split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export interface IntlCartItem {
  product_id?: string;
  product_name: string;
  sku?: string | null;
  variant_id?: string;
  size?: string | null;
  colour?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image?: string | null;
}

export interface IntlRequest {
  id?: string;
  reference_number: string;
  access_token?: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string;
  country: string;
  city: string;
  address?: string | null;
  postcode?: string | null;
  cart_items: IntlCartItem[];
  product_total: number;
  currency: string;
  shipping_cost: number | null;
  shipping_currency: string | null;
  final_total: number | null;
  final_currency: string | null;
  shipping_provider: string | null;
  estimated_delivery: string | null;
  shipping_notes: string | null;
  fulfillment_location?: string | null;
  status: IntlStatus;
  created_at: string;
}

export const intlTable = () => (supabase as any).from('international_order_requests');

export function formatTsh(n: number) {
  return `TSh ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
}

export function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return 'To be confirmed';
  const c = (currency || 'TZS').toUpperCase();
  if (c === 'TZS') return formatTsh(amount);
  return `${c} ${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Guest access links are remembered on this device so the request is never lost. */
const LS_KEY = 'ab_intl_requests';
export function rememberRequest(ref: string, token: string) {
  try {
    const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as { ref: string; token: string }[];
    const next = [{ ref, token }, ...list.filter(r => r.ref !== ref)].slice(0, 20);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}
export function tokenFor(ref: string): string | null {
  try {
    const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as { ref: string; token: string }[];
    return list.find(r => r.ref === ref)?.token || null;
  } catch { return null; }
}

export function requestPath(ref: string, token?: string | null) {
  return `/international-order/${encodeURIComponent(ref)}${token ? `?t=${encodeURIComponent(token)}` : ''}`;
}

export async function getIntlWhatsAppNumber(): Promise<string | null> {
  const { data } = await (supabase as any).from('app_settings').select('value').eq('key', 'intl_whatsapp_number').maybeSingle();
  const digits = String(data?.value || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

export function buildWhatsAppMessage(r: { reference_number: string; customer_name: string; country: string; city: string; customer_phone: string; cart_items: IntlCartItem[]; product_total: number }) {
  const lines = [
    'Hello African Boy Team 👋', '',
    "I'd like to place an international order.", '',
    'Order Reference:', r.reference_number, '',
    'Customer:', r.customer_name, '',
    'Country:', r.country, '',
    'City:', r.city, '',
    'Phone:', r.customer_phone, '',
    'ORDER:', '',
  ];
  r.cart_items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.product_name}`);
    if (it.size) lines.push(`Size: ${it.size}`);
    if (it.colour) lines.push(`Colour: ${it.colour}`);
    lines.push(`Qty: ${it.quantity}`);
    lines.push(`Price: ${formatTsh(it.unit_price)}`, '');
  });
  lines.push('PRODUCT TOTAL:', formatTsh(r.product_total), '',
    'International shipping:', 'To be confirmed', '',
    'Please confirm product availability and provide the international shipping cost and final payment instructions.', '',
    'Thank you.');
  return lines.join('\n');
}

/** Official click-to-chat link — opens the app on mobile and WhatsApp Web on desktop. */
export function whatsappUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
