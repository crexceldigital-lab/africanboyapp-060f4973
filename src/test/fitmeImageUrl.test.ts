import { describe, expect, it } from 'vitest';
import { fitmeImageUrl } from '@/lib/fitmeImageUrl';

describe('Fit Me provider image URLs', () => {
  it('resolves a real catalogue site path without changing the filename', () => {
    expect(fitmeImageUrl('/images/products/royal-blue-suede-jacket.jpg', 'https://africanboy.africa'))
      .toBe('https://africanboy.africa/images/products/royal-blue-suede-jacket.jpg');
  });
  it('preserves full CDN and image data URLs', () => {
    for (const url of ['https://cdn.example.org/product.jpg', 'data:image/png;base64,aGVsbG8=']) {
      expect(fitmeImageUrl(url, 'https://africanboy.africa')).toBe(url);
    }
  });
  it('rejects unsupported provider URL schemes', () => {
    expect(() => fitmeImageUrl('file:///image.jpg', 'https://africanboy.africa')).toThrow();
  });
});