import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProductCanonicalUrl,
  getProductShareText,
  copyProductLink,
} from '../lib/shareUtils';
import { Product } from '../types';

const mockProduct: Product = {
  id: 'prod-share-101',
  name: 'AFB Signature Essential Tee',
  price: 45000,
  category: 'T-Shirt',
  image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
  description: 'Premium African Boy t-shirt.',
  stock_quantity: 50,
  sizes: ['M', 'L', 'XL'],
  colors: [{ name: 'Black', hex: '#000000' }],
};

describe('Share Product Feature Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates canonical product URL with shop query parameter', () => {
    const url = getProductCanonicalUrl(mockProduct);
    expect(url).toContain('/shop?product=prod-share-101');
  });

  it('generates formatted share text including product name and price', () => {
    const shareText = getProductShareText(mockProduct, 'TSh 45,000');
    expect(shareText).toContain('AFB Signature Essential Tee');
    expect(shareText).toContain('Price: TSh 45,000');
    expect(shareText).toContain('Discover it at African Boy.');
  });

  it('copies product URL to clipboard successfully', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const success = await copyProductLink({
      product: mockProduct,
      formattedPrice: 'TSh 45,000',
    });

    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/shop?product=prod-share-101'));
  });
});
