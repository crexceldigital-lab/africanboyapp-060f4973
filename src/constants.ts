import { Home, Image, ShoppingBag, Calendar, Zap, User, ShieldCheck, Sparkles } from 'lucide-react';
import { NavTab } from './types';
import type { LucideIcon } from 'lucide-react';

export const PRODUCT_CATEGORIES = [
  'T-Shirt',
  'Hoods',
  'Jeans',
  'Accessories',
  'Footwear',
  'Tracksuit',
  'Caps',
];

export const NAV_ITEMS: { id: NavTab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'shop', icon: ShoppingBag, label: 'Shop' },
  { id: 'video', icon: Image, label: 'Gallery' },
  { id: 'fitme', icon: Sparkles, label: 'Fit Me' },
  { id: 'vip', icon: Zap, label: 'COMBOS' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'admin', icon: ShieldCheck, label: 'Admin' },
];
