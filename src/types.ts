import { LucideIcon } from 'lucide-react';

export type NavTab = 'home' | 'shop' | 'video' | 'vip' | 'fitme' | 'profile' | 'admin';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  description: string;
  stock_quantity: number;
  sizes: string[];
  colors: ProductColor[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
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
