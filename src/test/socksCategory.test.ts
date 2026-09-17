import { describe, it, expect } from 'vitest';
import { PRODUCT_CATEGORIES } from '../constants';
import { MOCK_PRODUCTS } from '../data/mockData';
import { mapNavCategoryToFilter } from '../components/SidebarMenu';

describe('Socks Category & Product System Integration', () => {
  it('includes Socks in PRODUCT_CATEGORIES list', () => {
    expect(PRODUCT_CATEGORIES).toContain('Socks');
  });

  it('maps mobile navigation Socks filter correctly', () => {
    expect(mapNavCategoryToFilter('Socks')).toBe('Socks');
  });

  it('includes valid Socks products in MOCK_PRODUCTS dataset', () => {
    const sockProducts = MOCK_PRODUCTS.filter((p) => p.category === 'Socks');
    expect(sockProducts.length).toBeGreaterThan(0);

    sockProducts.forEach((sock) => {
      expect(sock.id).toBeDefined();
      expect(sock.name).toContain('Sock');
      expect(sock.price).toBeGreaterThan(0);
      expect(sock.sizes).toEqual(expect.arrayContaining(['S', 'M', 'L', 'XL']));
      expect(sock.colors.length).toBeGreaterThan(1);
      expect(sock.stock_quantity).toBeGreaterThan(0);
    });
  });
});
