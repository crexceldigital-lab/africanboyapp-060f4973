import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, CartItem, AppEvent } from '../types';
import { trackAddToCart } from '../lib/analytics';

export type DeliveryZone = 'inside_dar' | 'outside_dar' | 'pickup';

const DELIVERY_PRICES: Record<DeliveryZone, number> = {
  inside_dar: 3000,
  outside_dar: 10000,
  pickup: 0,
};

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size?: string, color?: string, quantityToAdd?: number) => void;
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
  const grandTotal = cartTotal + deliveryFee;

  return (
    <CartContext.Provider value={{ cart, addToCart, addTicket, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal, deliveryZone, setDeliveryZone, deliveryFee, grandTotal }}>
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
