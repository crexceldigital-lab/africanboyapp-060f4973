import { Home, Image, ShoppingBag, Calendar, Zap, User, ShieldCheck, Sparkles } from 'lucide-react';
import { NavTab } from './types';
import type { LucideIcon } from 'lucide-react';

export const NAV_ITEMS: { id: NavTab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'video', icon: Image, label: 'Gallery' },
  { id: 'shop', icon: ShoppingBag, label: 'Shop' },
  
  { id: 'vip', icon: Zap, label: 'COMBOS' },
  { id: 'fitme', icon: Sparkles, label: 'Fit Me' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'admin', icon: ShieldCheck, label: 'Admin' },
];
