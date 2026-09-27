import { Home, Image, ShoppingBag, Calendar, Zap, User, ShieldCheck, Sparkles } from 'lucide-react';
import { NavTab } from './types';
import type { LucideIcon } from 'lucide-react';

export const PRODUCT_CATEGORIES = [
  'T-Shirt',
  'Shirts',
  'Shorts',
  'Jeans',
  'Jackets',
  'Leather Jackets',
  'Leather Coats',
  'Hoods',
  'Socks',
  'Caps',
  'Boxer',
  'Footwear',
  'Accessories',
  'Tracksuit',
];

export const AFRICAN_BOY_FASHION_COLORS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Cream', hex: '#fdfbf7' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Brown', hex: '#8b4513' },
  { name: 'Dark Brown', hex: '#3e2723' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Navy Blue', hex: '#1b2a4a' },
  { name: 'Royal Blue', hex: '#4169e1' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Green', hex: '#15803d' },
  { name: 'Olive', hex: '#556b2f' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Tan', hex: '#d2b48c' },
  { name: 'Camel', hex: '#c19a6b' },
];

export const LEATHER_COLOR_PRESETS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Brown', hex: '#8b4513' },
  { name: 'Dark Brown', hex: '#3e2723' },
  { name: 'Tan', hex: '#d2b48c' },
  { name: 'Camel', hex: '#c19a6b' },
  { name: 'Burgundy', hex: '#800020' },
];

export const PRESET_SIZES_CLOTHING = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
export const PRESET_SIZES_JEANS = ['28', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40'];
export const PRESET_SIZES_FOOTWEAR = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];
export const PRESET_SIZES_FREE = ['FREE SIZE'];

export function isFootwearCategory(category?: string, subcategory?: string): boolean {
  const text = `${category || ''} ${subcategory || ''}`.toLowerCase();
  return (
    text.includes('footwear') ||
    text.includes('shoe') ||
    text.includes('sneaker') ||
    text.includes('slide') ||
    text.includes('sandal') ||
    text.includes('kicks') ||
    text.includes('boots')
  );
}

export function isFreeSizeCategory(category?: string, subcategory?: string): boolean {
  const text = `${category || ''} ${subcategory || ''}`.toLowerCase();
  return (
    text.includes('cap') ||
    text.includes('hat') ||
    text.includes('bag') ||
    text.includes('accessory') ||
    text.includes('accessories') ||
    text.includes('socks')
  );
}

export function formatSizeDisplay(size?: string): string {
  if (!size) return '';
  const clean = size.trim();
  if (clean.toUpperCase() === 'FREE SIZE' || clean.toUpperCase() === 'ONE SIZE' || clean.toUpperCase() === 'FS') {
    return 'FREE SIZE';
  }
  if (clean.toLowerCase().startsWith('size ')) {
    return clean;
  }
  return `Size ${clean}`;
}

export const NAV_ITEMS: { id: NavTab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'shop', icon: ShoppingBag, label: 'Shop' },
  { id: 'video', icon: Image, label: 'Gallery' },
  { id: 'fitme', icon: Sparkles, label: 'Fit Me' },
  { id: 'vip', icon: Zap, label: 'COMBOS' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'admin', icon: ShieldCheck, label: 'Admin' },
];
