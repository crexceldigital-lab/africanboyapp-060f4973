import { Home, Play, ShoppingBag, Calendar, Zap, User, ShieldCheck } from 'lucide-react';
import { NavTab } from './types';
import type { LucideIcon } from 'lucide-react';

export const NAV_ITEMS: { id: NavTab; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'video', icon: Play, label: 'Gallery' },
  { id: 'shop', icon: ShoppingBag, label: 'Shop' },
  { id: 'events', icon: Calendar, label: 'Events' },
  { id: 'vip', icon: Zap, label: 'COMBOS' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'admin', icon: ShieldCheck, label: 'Admin' },
];
