import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, CartItem, AppEvent } from '../types';
import { trackAddToCart } from '../lib/analytics';

export type DeliveryZone = 'inside_dar' | 'outside_dar' | 'pickup';

const DELIVERY_PRICES: Record<DeliveryZone, number> = {
  inside_dar: 3000,
  outside_dar: 10000,
  pickup: 0,
};

export const COMBO_DISCOUNT_RATE = 0.05;

export interface ComboSelection {
  product: Product;
  size?: string;
  color?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size?: string, color?: string, quantityToAdd?: number) => void;
  addComboToCart: (selections: ComboSelection[]) => void;
  discountAmount: number;
  addTicket: (event: AppEvent) => void;
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  deliveryZone: DeliveryZone;
  setDeliveryZone: (zone: DeliveryZone) => void;
  deliveryFee: number;
  grandTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getCartKey(productId: string, size?: string, color?: string) {
  return `${productId}-${size || ''}-${color || ''}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>('inside_dar');

  const addToCart = (product: Product, size?: string, color?: string, quantityToAdd: number = 1) => {
    const qty = Math.max(1, quantityToAdd);
    const key = getCartKey(product.id, size, color);
    trackAddToCart(
      { id: product.id, name: product.name, price: product.price, quantity: qty, category: product.category, selectedSize: size, selectedColor: color },
      'TZS'
    );
    setCart(prevCart => {
      const existingItem = prevCart.find(item => getCartKey(item.id, item.selectedSize, item.selectedColor) === key);
      if (existingItem) {
        return prevCart.map(item =>
          getCartKey(item.id, item.selectedSize, item.selectedColor) === key
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: qty, selectedSize: size, selectedColor: color }];
    });
  };

  // Combo kits are added as their REAL products (real ids) so checkout and stock work.
  // Each garment keeps its chosen size/colour and merges with any matching line already in the cart,
  // so cart keys stay unique and quantity / remove controls only affect one row.
  const addComboToCart = (selections: ComboSelection[]) => {
    const comboId = `combo-${Date.now()}`;
    setCart(prevCart => {
      let next = [...prevCart];
      selections.forEach(({ product, size, color }) => {
        const key = getCartKey(product.id, size, color);
        const index = next.findIndex(
          item => getCartKey(item.id, item.selectedSize, item.selectedColor) === key
        );
        if (index >= 0) {
          const existing = next[index];
          next[index] = {
            ...existing,
            quantity: existing.quantity + 1,
            comboId: existing.comboId || comboId,
            comboQty: (existing.comboQty || 0) + 1,
          };
        } else {
          next = [
            ...next,
            { ...product, quantity: 1, selectedSize: size, selectedColor: color, comboId, comboQty: 1 } as CartItem,
          ];
        }
      });
      return next;
    });
    selections.forEach(({ product, size, color }) =>
      trackAddToCart(
        { id: product.id, name: product.name, price: product.price, quantity: 1, category: product.category, selectedSize: size, selectedColor: color },
        'TZS'
      )
    );
  };

  const addTicket = (event: AppEvent) => {
    const ticketProduct: Product = {
      id: `ticket-${event.id}`,
      name: `Ticket: ${event.title}`,
      price: event.price,
      category: 'Ticket',
      image_url: event.image_url,
      description: `Entry ticket for ${event.title} at ${event.location}`,
      stock_quantity: 999,
      sizes: [],
      colors: [],
    };
    addToCart(ticketProduct);
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (getCartKey(item.id, item.selectedSize, item.selectedColor) === cartKey) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prevCart => prevCart.filter(item => getCartKey(item.id, item.selectedSize, item.selectedColor) !== cartKey));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const deliveryFee = cart.length > 0 ? DELIVERY_PRICES[deliveryZone] : 0;
  const comboSubtotal = cart.reduce(
    (total, item) => total + (item.comboId ? item.price * item.quantity : 0),
    0
  );
  const discountAmount = Math.round(comboSubtotal * COMBO_DISCOUNT_RATE);
  const grandTotal = Math.max(0, cartTotal - discountAmount) + deliveryFee;

  return (
    <CartContext.Provider value={{ cart, addToCart, addComboToCart, discountAmount, addTicket, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal, deliveryZone, setDeliveryZone, deliveryFee, grandTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
