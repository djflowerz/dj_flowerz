import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, variant?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  taxAmount: number;
  cartTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, quantity: number = 1, variant?: string) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id && item.selectedVariant === variant);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.selectedVariant === variant) 
          ? { ...item, quantity: item.quantity + quantity } 
          : item
        );
      }
      return [...prev, { ...product, quantity, selectedVariant: variant }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item));
  }

  const clearCart = () => setItems([]);

  // Price Calculation Logic
  // Prices are Tax Inclusive
  const cartSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Back-calculate tax from the inclusive total (VAT 16%)
  // Formula: Tax = Total - (Total / 1.16)
  const taxAmount = cartSubtotal - (cartSubtotal / 1.16); 
  
  // Total is just the subtotal since tax is already inside
  const cartTotal = cartSubtotal;
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, cartSubtotal, taxAmount, cartTotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};