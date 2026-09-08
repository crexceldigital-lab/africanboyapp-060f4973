import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductDetailModal from '../components/ProductDetailModal';
import { CartProvider } from '../context/CartContext';
import { CountryProvider } from '../context/CountryContext';
import { Product } from '../types';

const mockProduct: Product = {
  id: 'test-cap-1',
  name: 'AFB PREMIUM CAP',
  price: 25000,
  sale_price: 20000,
  on_sale: true,
  discount_percent: 20,
  category: 'Caps',
  sku: 'AFB-CAP-01',
  image_url: 'https://example.com/cap.jpg',
  description: 'Luxury African Boy Cap with gold embroidery.',
  stock_quantity: 10,
  sizes: ['S', 'M', 'L', 'XL'],
  colors: [
    { name: 'Black', hex: '#000000' },
    { name: 'Gold', hex: '#F5A623' },
  ],
};

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <CountryProvider>
      <CartProvider>{ui}</CartProvider>
    </CountryProvider>
  );
};

describe('ProductDetailModal', () => {
  it('renders product details accurately without cropping elements', () => {
    const handleClose = vi.fn();
    renderWithProviders(<ProductDetailModal product={mockProduct} onClose={handleClose} />);

    // Product Title
    expect(screen.getByText('AFB PREMIUM CAP')).toBeInTheDocument();
    // Category & SKU
    expect(screen.getByText('Caps')).toBeInTheDocument();
    expect(screen.getByText('AFB-CAP-01')).toBeInTheDocument();
    // Discount Tag
    expect(screen.getByText('-20% OFF')).toBeInTheDocument();
    // Description
    expect(
      screen.getByText('Luxury African Boy Cap with gold embroidery.')
    ).toBeInTheDocument();
  });

  it('allows selecting colors and sizes', () => {
    const handleClose = vi.fn();
    renderWithProviders(<ProductDetailModal product={mockProduct} onClose={handleClose} />);

    // Select color
    const goldColorBtn = screen.getByLabelText('Select color Gold');
    fireEvent.click(goldColorBtn);

    // Select size L
    const sizeLBtn = screen.getByRole('button', { name: 'L' });
    fireEvent.click(sizeLBtn);
    expect(sizeLBtn).toHaveClass('bg-primary');
  });

  it('increases and decreases quantity', () => {
    const handleClose = vi.fn();
    renderWithProviders(<ProductDetailModal product={mockProduct} onClose={handleClose} />);

    const increaseBtn = screen.getByLabelText('Increase quantity');
    const decreaseBtn = screen.getByLabelText('Decrease quantity');

    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(increaseBtn);
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(decreaseBtn);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('triggers Add to Cart with selected options', () => {
    const handleClose = vi.fn();
    renderWithProviders(<ProductDetailModal product={mockProduct} onClose={handleClose} />);

    const addToCartBtns = screen.getAllByRole('button', { name: /ADD TO CART/i });
    fireEvent.click(addToCartBtns[0]);

    expect(screen.getAllByText(/ADDED TO CART ✓/i)[0]).toBeInTheDocument();
  });
});
