import { Product, AppEvent, ContentItem, GalleryItem, Country, ExchangeRate, User, Purchase } from '../types';

export const MOCK_USER: User = {
  id: 1,
  email: 'fan@africanboy.com',
  phone_number: '+255712345678',
  full_name: 'Jux Fan',
  role: 'user',
  vip_tier: 'Gold',
  country_id: 1,
  country_name: 'Tanzania',
  country_code: 'TZ',
  currency_code: 'TZS',
  currency_symbol: 'TSh',
};

export const MOCK_COUNTRIES: Country[] = [
  { id: 1, name: 'Tanzania', code: 'TZ', currency_code: 'TZS', currency_symbol: 'TSh', flag_emoji: '🇹🇿', is_active: true },
  { id: 2, name: 'Nigeria', code: 'NG', currency_code: 'NGN', currency_symbol: '₦', flag_emoji: '🇳🇬', is_active: true },
];

export const MOCK_EXCHANGE_RATES: ExchangeRate[] = [
  { id: 1, from_currency: 'TZS', to_currency: 'TZS', rate: 1 },
  { id: 2, from_currency: 'TZS', to_currency: 'NGN', rate: 0.65 },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'AFB Signature Tee', price: 45000, category: 'T-Shirt', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', description: 'Premium cotton signature tee', stock_quantity: 25, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#f5f5f5' }, { name: 'Gold', hex: '#c8a45c' }] },
  { id: 2, name: 'African Boy Hoodie', price: 85000, category: 'Hoods', image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', description: 'Warm fleece hoodie with embroidered logo', stock_quantity: 15, sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Charcoal', hex: '#36454f' }] },
  { id: 3, name: 'Legacy Denim', price: 75000, category: 'Jeans', image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', description: 'Slim fit premium denim jeans', stock_quantity: 20, sizes: ['28', '30', '32', '34', '36'], colors: [{ name: 'Indigo', hex: '#3f51b5' }, { name: 'Black', hex: '#1a1a1a' }] },
  { id: 4, name: 'Gold Chain Cap', price: 35000, category: 'Accessories', image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400', description: 'Snapback cap with gold chain detail', stock_quantity: 30, sizes: ['One Size'], colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Gold', hex: '#c8a45c' }] },
  { id: 5, name: 'Bongo Streetwear Tee', price: 40000, category: 'T-Shirt', image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400', description: 'Street style graphic tee', stock_quantity: 18, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: [{ name: 'White', hex: '#f5f5f5' }, { name: 'Olive', hex: '#556b2f' }, { name: 'Navy', hex: '#1b2a4a' }] },
  { id: 6, name: 'Movement Joggers', price: 65000, category: 'Jeans', image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400', description: 'Comfortable jogger pants', stock_quantity: 22, sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Grey', hex: '#808080' }] },
  { id: 7, name: 'Dar es Salaam Hoodie', price: 90000, category: 'Hoods', image_url: 'https://images.unsplash.com/photo-1578768079470-c6e8cc04fcb4?w=400', description: 'Limited edition Dar hoodie', stock_quantity: 8, sizes: ['M', 'L', 'XL'], colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Burgundy', hex: '#800020' }] },
  { id: 8, name: 'AFB Wristband', price: 15000, category: 'Accessories', image_url: 'https://images.unsplash.com/photo-1573053986173-5e85dee6baf7?w=400', description: 'Silicone wristband set', stock_quantity: 50, sizes: ['One Size'], colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Gold', hex: '#c8a45c' }, { name: 'Red', hex: '#dc2626' }] },
];

export const MOCK_EVENTS: AppEvent[] = [
  { id: 1, title: 'JUX LIVE IN DAR', date: '2026-04-15', location: 'Mlimani City Hall, Dar es Salaam', price: 50000, image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600' },
  { id: 2, title: 'AFRICAN BOY TOUR — LAGOS', date: '2026-05-20', location: 'Eko Convention Center, Lagos', price: 75000, image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600' },
  { id: 3, title: 'BONGO FLAVA NIGHT', date: '2026-06-10', location: 'Serena Hotel, Nairobi', price: 0, image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600' },
];

export const MOCK_CONTENT: ContentItem[] = [
  { id: 1, title: 'Nimekukuta — Official Video', type: 'Music Video', thumbnail_url: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400', is_vip: false },
  { id: 2, title: 'Behind The Scenes — Lagos Tour', type: 'Documentary', thumbnail_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', is_vip: false },
  { id: 3, title: 'Studio Session — Unreleased Track', type: 'Exclusive', thumbnail_url: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=400', is_vip: true },
  { id: 4, title: 'Jux x Diamond — Live Performance', type: 'Concert', thumbnail_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400', is_vip: false },
];

export const MOCK_GALLERY: GalleryItem[] = [
  { id: 1, image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400', created_at: '2026-01-15' },
  { id: 2, image_url: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=400', created_at: '2026-01-10' },
  { id: 3, image_url: 'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=400', created_at: '2026-01-05' },
  { id: 4, image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', created_at: '2025-12-20' },
  { id: 5, image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', created_at: '2025-12-15' },
  { id: 6, image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400', created_at: '2025-12-10' },
  { id: 7, image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', created_at: '2025-12-05' },
  { id: 8, image_url: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400', created_at: '2025-12-01' },
];

export const MOCK_PURCHASES: Purchase[] = [
  { id: 1, user_id: 1, product_name: 'AFB Signature Tee', amount: 45000, currency_code: 'TZS', date: '2026-02-15' },
  { id: 2, user_id: 1, product_name: 'Ticket: JUX LIVE IN DAR', amount: 50000, currency_code: 'TZS', date: '2026-02-10' },
];
