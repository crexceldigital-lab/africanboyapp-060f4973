import { LucideIcon } from 'lucide-react';

export type NavTab = 'home' | 'shop' | 'video' | 'vip' | 'fitme' | 'profile' | 'admin';

export type AdminTab = 'dashboard' | 'pos' | 'products' | 'orders' | 'customers' | 'attributes' | 'gallery' | 'reports' | 'staff';

export interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  image_url?: string;
  available?: boolean;
  status?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  sale_price?: number | null;

  on_sale?: boolean;
  discount_percent?: number;
  sku?: string | null;
  category: string;
  subcategory?: string | null;
  image_url: string;
  images?: string[];
  description: string;
  stock_quantity: number;
  stock?: Record<string, number> | null;
  sizes: string[];
  colors: ProductColor[];
  status?: 'active' | 'inactive' | 'stock_out' | string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductOfTheDay {
  id: string;
  product_id: string;
  set_for_date: string;
  created_at: string;
  product?: Product;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderItem {
  id?: string;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  quantity_shipped?: number;
  quantity_remaining?: number;
  size?: string;
  color?: string;
  sku?: string;
  image_url?: string;
}

export interface SalePayment {
  id?: string;
  order_id?: string;
  payment_method: string;
  amount: number;
  reference?: string | null;
  created_at?: string;
}

export interface OrderShipmentItem {
  id?: string;
  shipment_id?: string;
  product_id?: string | null;
  product_name: string;
  quantity_shipped: number;
}

export interface OrderShipment {
  id: string;
  order_id: string;
  carrier: string;
  tracking_number?: string | null;
  status: string;
  shipped_at: string;
  created_by?: string | null;
  notes?: string | null;
  created_at?: string;
  items?: OrderShipmentItem[];
}

export interface OrderActivity {
  id: string;
  order_id: string;
  actor_id?: string | null;
  actor_name: string;
  action: string;
  details?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number?: string | null;
  user_id?: string | null;
  store_id?: number | null;
  staff_user_id?: string | null;
  sale_type?: 'online' | 'in_store' | string;
  receipt_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number;
  subtotal?: number;
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  approved_by?: string | null;
  total_amount: number;
  payment_status?: 'unpaid' | 'paid' | 'partially_paid' | string;
  amount_paid?: number;
  balance?: number;
  is_guest?: boolean;
  currency?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'refunded' | string;
  payment_method?: string | null;
  payment_reference?: string | null;
  snippe_checkout_url?: string | null;
  items: OrderItem[];
  payments?: SalePayment[];
  shipments?: OrderShipment[];
  activities?: OrderActivity[];
  notes?: string | null;
  is_voided?: boolean;
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  store_id?: number | null;
  staff_user_id?: string | null;
  quantity: number;
  movement_type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'VOID' | string;
  reference_id?: string | null;
  previous_stock: number;
  new_stock: number;
  created_at: string;
  product_name?: string;
}

export interface HeldSale {
  id: string;
  hold_number: string;
  store_id: number;
  staff_user_id: string;
  customer_data?: { id?: string; name: string; phone?: string; email?: string } | null;
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
}

export interface PosAuditLog {
  id: string;
  user_id?: string;
  store_id?: number;
  action: string;
  reference?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Store {
  id: number;
  name: string;
  country_code: string;
  currency_code: string;
  country?: string;
  location_name?: string;
  store_code?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  staff_count?: number;
}

export interface ProductStoreAvailability {
  id: string;
  product_id: string;
  store_id: number;
  is_available: boolean;
  stock_quantity: number;
}

export interface StoreStaff {
  id: string;
  user_id: string;
  store_id: number;
  staff_role: 'sales_rep' | 'store_manager' | string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  store?: Store;
}

export interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  joined_date: string;
  total_orders: number;
  total_spent: number;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface AttributeSize {
  id: string;
  name: string;
  sort_order: number;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface AttributeColor {
  id: string;
  name: string;
  hex: string;
  status: string;
  created_at?: string;
  product_count?: number;
}

export interface AppEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  price: number;
  image_url: string;
}

export interface ContentItem {
  id: number;
  title: string;
  type: string;
  thumbnail_url: string;
  is_vip: boolean;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  phone_number: string;
  full_name: string;
  role: string;
  vip_tier: string;
  country_id: number;
  country_name?: string;
  country_code?: string;
  currency_code?: string;
  currency_symbol?: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  currency_code: string;
  currency_symbol: string;
  flag_emoji: string;
  is_active: boolean;
}

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
}

export interface Purchase {
  id: number;
  user_id: number;
  product_name: string;
  amount: number;
  currency_code: string;
  date: string;
}
