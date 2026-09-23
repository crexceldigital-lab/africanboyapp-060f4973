import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderItem, Product, ProductColor } from '@/types';

/**
 * Typed helper to query tables that are not yet in the generated Supabase
 * Database types. This avoids the "Type instantiation is excessively deep"
 * errors caused by referencing missing table keys.
 */
export function fromAny(table: string) {
  return (supabase as any).from(table);
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseRecord(value: unknown): Record<string, number> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, number>;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Cast raw product rows from Supabase into the app's Product type,
 * normalising JSON fields (colors, stock).
 */
export function castProducts(data: any[]): Product[] {
  return data.map((p: any) => ({
    ...p,
    price: Number(p.price) || 0,
    sale_price: p.sale_price != null ? Number(p.sale_price) : null,
    on_sale: Boolean(p.on_sale),
    discount_percent: Number(p.discount_percent) || 0,
    stock_quantity: Number(p.stock_quantity) || 0,
    colors: parseJsonArray<ProductColor>(p.colors),
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    stock: parseRecord(p.stock),
  })) as Product[];
}

export function generateOrderNumber(): string {
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
  return `AFB-${new Date().getFullYear()}-${randomSixDigits}`;
}

/**
 * Cast raw order rows from Supabase into the app's Order type,
 * normalising the JSON items field and item fulfillment calculations.
 */
export function castOrders(data: any[]): Order[] {
  return data.map((o: any) => {
    const rawItems = parseJsonArray<OrderItem>(o.items);
    const items = rawItems.map((item) => {
      const qty = Number(item.quantity) || 1;
      const shipped = Number(item.quantity_shipped) || 0;
      const remaining = Math.max(0, qty - shipped);
      return {
        ...item,
        quantity: qty,
        quantity_shipped: shipped,
        quantity_remaining: remaining,
      };
    });

    const totalAmount = Number(o.total_amount) || 0;
    const payments = parseJsonArray<any>(o.payments || []);
    const amountPaid = o.amount_paid != null ? Number(o.amount_paid) : (payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || (o.status === 'completed' ? totalAmount : 0));
    const balance = o.balance != null ? Number(o.balance) : Math.max(0, totalAmount - amountPaid);
    const paymentStatus = o.payment_status || (amountPaid >= totalAmount ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid');

    return {
      ...o,
      total_amount: totalAmount,
      delivery_fee: Number(o.delivery_fee) || 0,
      subtotal: Number(o.subtotal) || 0,
      discount_amount: Number(o.discount_amount) || 0,
      amount_paid: amountPaid,
      balance: balance,
      payment_status: paymentStatus,
      items,
      payments,
    };
  }) as Order[];
}

/**
 * Execute atomic POS sale via RPC process_pos_sale
 */
export async function executePosSale(payload: {
  storeId: number;
  staffUserId: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    sku?: string;
    image_url?: string;
  }>;
  subtotal: number;
  discountAmount: number;
  discountType?: string;
  discountValue?: number;
  approvedBy?: string | null;
  totalAmount: number;
  payments: Array<{
    payment_method: string;
    amount: number;
    reference?: string | null;
  }>;
  notes?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke('pos-operations', {
    body: {
      action: 'pos_sale',
      storeId: payload.storeId,
      customerId: payload.customerId || null,
      customerName: payload.customerName || 'Walk-in Customer',
      customerPhone: payload.customerPhone || null,
      customerEmail: payload.customerEmail || null,
      items: payload.items,
      subtotal: payload.subtotal,
      discountAmount: payload.discountAmount,
      discountType: payload.discountType || 'none',
      discountValue: payload.discountValue || 0,
      approvedBy: payload.approvedBy || null,
      totalAmount: payload.totalAmount,
      payments: payload.payments,
      notes: payload.notes || null,
    },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Sale could not be completed');
  return data;
}

/**
 * Void a POS sale (server-side authorisation: store manager or admin only)
 */
export async function executeVoidSale(orderId: string, staffUserId: string, reason: string) {
  const { data, error } = await supabase.functions.invoke('pos-operations', {
    body: { action: 'void_sale', orderId, reason },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Sale could not be voided');
  return data;
}


