import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShareProductModal from '../components/ShareProductModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { CartProvider, useCart } from '../context/CartContext';
import { CountryProvider } from '../context/CountryContext';
import { Product } from '../types';
import { getWhatsAppShareText, getProductCanonicalUrl } from '../lib/shareUtils';
import { TSHIRT_SIZES } from '../constants';

const mockTShirtProduct: Product = {
  id: 'tshirt-workflow-1',
  name: 'AFB Legacy Heavyweight T-Shirt',
  price: 45000,
  category: 'T-Shirt',
  image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  description: 'Premium heavyweight cotton African Boy t-shirt.',
  stock_quantity: 60,
  sizes: TSHIRT_SIZES,
  colors: [{ name: 'Black', hex: '#1a1a1a' }],
};

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <CountryProvider>
      <CartProvider>{ui}</CartProvider>
    </CountryProvider>
  );
};

describe('Full Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Product Sharing System', () => {
    it('opens share modal and renders all sharing platform options', () => {
      renderWithProviders(
        <ShareProductModal product={mockTShirtProduct} isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByRole('heading', { name: /SHARE PRODUCT/i })).toBeInTheDocument();
      expect(screen.getByText('AFB Legacy Heavyweight T-Shirt')).toBeInTheDocument();
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Instagram Story')).toBeInTheDocument();
      expect(screen.getByText('Instagram DM')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('generates exact WhatsApp pre-filled message format', () => {
      const text = getWhatsAppShareText(mockTShirtProduct, 'TSh 45,000');
      const url = getProductCanonicalUrl(mockTShirtProduct);

      expect(text).toBe(
        `Check out this African Boy product:\n\nAFB Legacy Heavyweight T-Shirt\n\nTSh 45,000\n\n${url}`
      );
    });

    it('triggers Copy Link and shows exact toast message', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      renderWithProviders(
        <ShareProductModal product={mockTShirtProduct} isOpen={true} onClose={vi.fn()} />
      );

      const copyBtn = screen.getByRole('button', { name: /Copy Link/i });
      fireEvent.click(copyBtn);

      expect(await screen.findByText('✓ Product link copied')).toBeInTheDocument();
    });

    it('triggers Instagram Direct and shows correct clipboard message', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      window.open = vi.fn();

      renderWithProviders(
        <ShareProductModal product={mockTShirtProduct} isOpen={true} onClose={vi.fn()} />
      );

      const igDmBtn = screen.getByRole('button', { name: /Instagram DM/i });
      fireEvent.click(igDmBtn);

      expect(
        await screen.findByText('Product link copied. Open Instagram and paste it into your Direct Message.')
      ).toBeInTheDocument();
    });

    it('triggers Instagram Story fallback on browser without native share', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
        share: undefined,
      });

      renderWithProviders(
        <ShareProductModal product={mockTShirtProduct} isOpen={true} onClose={vi.fn()} />
      );

      const igStoryBtn = screen.getByRole('button', { name: /Instagram Story/i });
      fireEvent.click(igStoryBtn);

      expect(
        await screen.findByText('Product link copied. Open Instagram and paste it into your Story.')
      ).toBeInTheDocument();
    });
  });

  describe('2. T-Shirt Sizes & Cart Integration', () => {
    it('displays exact T-shirt sizes M, L, XL, XXL, XXXL, XXXXL on detail modal', () => {
      renderWithProviders(
        <ProductDetailModal product={mockTShirtProduct} onClose={vi.fn()} />
      );

      expect(screen.getByText('SELECT SIZE')).toBeInTheDocument();
      TSHIRT_SIZES.forEach((size) => {
        expect(screen.getByRole('button', { name: new RegExp(`^${size}`, 'i') })).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /^S$/i })).not.toBeInTheDocument();
    });

    it('allows selecting sizes M, XL, XXXXL and saves selectedSize to cart correctly', () => {
      let cartState: any[] = [];
      const TestConsumer = () => {
        const { cart } = useCart();
        cartState = cart;
        return (
          <div>
            Cart items: {cart.length}
            {cart.map((item, idx) => (
              <div key={idx} data-testid={`cart-item-${idx}`}>
                {item.name} - Size: {item.selectedSize}
              </div>
            ))}
          </div>
        );
      };

      render(
        <CountryProvider>
          <CartProvider>
            <ProductDetailModal product={mockTShirtProduct} onClose={vi.fn()} />
            <TestConsumer />
          </CartProvider>
        </CountryProvider>
      );

      // Select size M and Add to Cart
      const btnM = screen.getByRole('button', { name: /^M/i });
      fireEvent.click(btnM);
      const addBtns = screen.getAllByRole('button', { name: /ADD TO CART/i });
      fireEvent.click(addBtns[0]);

      // Select size XL and Add to Cart
      const btnXL = screen.getByRole('button', { name: /^XL/i });
      fireEvent.click(btnXL);
      fireEvent.click(addBtns[0]);

      // Select size XXXXL and Add to Cart
      const btnXXXXL = screen.getByRole('button', { name: /^XXXXL/i });
      fireEvent.click(btnXXXXL);
      fireEvent.click(addBtns[0]);

      // Check cartState items
      expect(cartState.length).toBe(3);
      expect(cartState[0].selectedSize).toBe('M');
      expect(cartState[1].selectedSize).toBe('XL');
      expect(cartState[2].selectedSize).toBe('XXXXL');
    });
  });
});
