import { describe, it, expect } from 'vitest';
import { TSHIRT_SIZES, isTShirtCategory } from '../constants';
import { castProducts } from '../lib/supabase-helpers';
import {
  getProductCanonicalUrl,
  getWhatsAppShareText,
  updateOpenGraphMeta,
} from '../lib/shareUtils';
import { Product } from '../types';

describe('T-Shirt Size Options & Sharing Integration', () => {
  it('defines the exact required T-Shirt sizes: M, L, XL, XXL, XXXL, XXXXL', () => {
    expect(TSHIRT_SIZES).toEqual(['M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']);
  });

  it('correctly identifies T-Shirt category and subcategory', () => {
    expect(isTShirtCategory('T-Shirt')).toBe(true);
    expect(isTShirtCategory('t-shirt')).toBe(true);
    expect(isTShirtCategory('Clothing', 'T-Shirt')).toBe(true);
    expect(isTShirtCategory('Jeans')).toBe(false);
    expect(isTShirtCategory('Shorts')).toBe(false);
    expect(isTShirtCategory('Footwear')).toBe(false);
  });

  it('enforces exact T-Shirt size variants in castProducts without affecting other categories', () => {
    const rawProducts = [
      {
        id: 'tshirt-1',
        name: 'AFB Graphic Tee',
        price: 45000,
        category: 'T-Shirt',
        sizes: ['S', 'M', 'L'], // Incorrect old sizes
        stock_quantity: 60,
      },
      {
        id: 'jeans-1',
        name: 'AFB Denim Jeans',
        price: 75000,
        category: 'Jeans',
        sizes: ['28', '30', '32', '34', '36'],
        stock_quantity: 20,
      },
    ];

    const casted = castProducts(rawProducts);
    const tshirt = casted.find((p) => p.id === 'tshirt-1');
    const jeans = casted.find((p) => p.id === 'jeans-1');

    // T-shirt MUST have exact sizes: M, L, XL, XXL, XXXL, XXXXL
    expect(tshirt?.sizes).toEqual(['M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']);
    expect(tshirt?.stock).toBeDefined();
    expect(Object.keys(tshirt?.stock || {})).toEqual(['M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']);

    // Jeans size options MUST NOT be changed
    expect(jeans?.sizes).toEqual(['28', '30', '32', '34', '36']);
  });

  it('formats WhatsApp pre-filled message correctly with product URL and price', () => {
    const testProduct: Product = {
      id: 'prod-123',
      name: 'AFB Signature Gold Tee',
      price: 50000,
      category: 'T-Shirt',
      image_url: 'https://example.com/tee.jpg',
      description: 'Gold tee',
      stock_quantity: 10,
      sizes: TSHIRT_SIZES,
      colors: [],
    };

    const text = getWhatsAppShareText(testProduct, 'TSh 50,000');
    const url = getProductCanonicalUrl(testProduct);

    expect(text).toContain('Check out this African Boy product:');
    expect(text).toContain('AFB Signature Gold Tee');
    expect(text).toContain('TSh 50,000');
    expect(text).toContain(url);
    expect(url).toContain('/shop?product=prod-123');
  });

  it('updates Open Graph meta tags dynamically', () => {
    const testProduct: Product = {
      id: 'prod-og-1',
      name: 'African Boy Heritage Tee',
      price: 45000,
      category: 'T-Shirt',
      image_url: 'https://example.com/og-tee.jpg',
      description: 'Heritage edition',
      stock_quantity: 15,
      sizes: TSHIRT_SIZES,
      colors: [],
    };

    updateOpenGraphMeta(testProduct);

    expect(document.title).toBe('African Boy Heritage Tee — AFRICAN BOY');
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content');

    expect(ogTitle).toBe('African Boy Heritage Tee — AFRICAN BOY');
    expect(ogImage).toBe('https://example.com/og-tee.jpg');
    expect(ogUrl).toContain('/shop?product=prod-og-1');
  });
});
