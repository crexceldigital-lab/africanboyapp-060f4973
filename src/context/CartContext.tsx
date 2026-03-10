import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, CartItem, AppEvent } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size?: string, color?: string) => void;
  addTicket: (event: AppEvent) => void;
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getCartKey(productId: number, size?: string, color?: string) {
  return `${productId}-${size || ''}-${color || ''}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product, size?: string, color?: string) => {
    const key = getCartKey(product.id, size, color);
    setCart(prevCart => {
      const existingItem = prevCart.find(item => getCartKey(item.id, item.selectedSize, item.selectedColor) === key);
      if (existingItem) {
        return prevCart.map(item =>
          getCartKey(item.id, item.selectedSize, item.selectedColor) === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, selectedSize: size, selectedColor: color }];
    });
  };

  const addTicket = (event: AppEvent) => {
    const ticketProduct: Product = {
      id: event.id + 10000,
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

  return (
    <CartContext.Provider value={{ cart, addToCart, addTicket, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}>
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
