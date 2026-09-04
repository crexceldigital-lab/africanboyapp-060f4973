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
    items: parseJsonArray<OrderItem>(o.items),
  })) as Order[];
}
