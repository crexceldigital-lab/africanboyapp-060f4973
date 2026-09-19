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

/**
 * Cast raw order rows from Supabase into the app's Order type,
 * normalising the JSON items field.
 */
export function castOrders(data: any[]): Order[] {
  return data.map((o: any) => ({
    ...o,
    total_amount: Number(o.total_amount) || 0,
    delivery_fee: Number(o.delivery_fee) || 0,
    subtotal: Number(o.subtotal) || 0,
    discount_amount: Number(o.discount_amount) || 0,
    items: parseJsonArray<OrderItem>(o.items),
  })) as Order[];
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
  const { data, error } = await (supabase as any).rpc('process_pos_sale', {
    p_store_id: payload.storeId,
    p_staff_user_id: payload.staffUserId,
    p_customer_id: payload.customerId || null,
    p_customer_name: payload.customerName || 'Walk-in Customer',
    p_customer_phone: payload.customerPhone || null,
    p_customer_email: payload.customerEmail || null,
    p_items: payload.items,
    p_subtotal: payload.subtotal,
    p_discount_amount: payload.discountAmount,
    p_discount_type: payload.discountType || 'none',
    p_discount_value: payload.discountValue || 0,
    p_approved_by: payload.approvedBy || null,
    p_total_amount: payload.totalAmount,
    p_payments: payload.payments,
    p_notes: payload.notes || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Void a POS sale via RPC void_pos_sale
 */
export async function executeVoidSale(orderId: string, staffUserId: string, reason: string) {
  const { data, error } = await (supabase as any).rpc('void_pos_sale', {
    p_order_id: orderId,
    p_staff_user_id: staffUserId,
    p_reason: reason,
  });

  if (error) throw error;
  return data;
}

