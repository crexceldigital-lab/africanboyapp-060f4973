import { LucideIcon } from 'lucide-react';

export type NavTab = 'home' | 'shop' | 'video' | 'vip' | 'fitme' | 'profile' | 'admin';

export type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'attributes' | 'gallery' | 'reports';

export interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  status?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number | null;
  on_sale?: boolean;
  discount_percent?: number;
  sku?: string | null;
  category: string;
  subcategory?: string | null;
  image_url: string;
  description: string;
  stock_quantity: number;
  stock?: Record<string, number> | null;
  sizes: string[];
  colors: ProductColor[];
  status?: 'active' | 'inactive' | 'stock_out' | string;
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
  size?: string;
  color?: string;
  image_url?: string;
}

export interface Order {
  id: string;
  user_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number;
  total_amount: number;
  currency?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'refunded' | string;
  payment_method?: string | null;
  payment_reference?: string | null;
  snippe_checkout_url?: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at?: string | null;
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
