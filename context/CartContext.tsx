import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, CartItem } from '../types';
import { toast } from 'sonner';

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
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('djf_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading cart from localStorage", e);
      return [];
    }
  });

  // Persist to localStorage
  React.useEffect(() => {
    localStorage.setItem('djf_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number = 1, variantId?: string) => {
    setItems(prev => {
      // Find the specific variant if variantId is provided
      let itemPrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;
      let itemCompareAtPrice = product.compareAtPrice;
      let itemDiscountPrice = product.discountPrice;
      let variantName = '';

      if (variantId && product.variantGroups) {
        for (const group of product.variantGroups) {
          const v = group.variants.find(v => v.id === variantId || v.name === variantId);
          if (v) {
            itemPrice = v.discountPrice && v.discountPrice > 0 ? v.discountPrice : v.price;
            itemCompareAtPrice = v.compareAtPrice || (v.discountPrice && v.discountPrice > 0 ? v.price : undefined);
            itemDiscountPrice = v.discountPrice;
            variantName = v.name;
            break;
          }
        }
      }

      const existing = prev.find(item => item.id === product.id && item.selectedVariant === (variantName || variantId));
      if (existing) {
        return prev.map(item =>
          (item.id === product.id && item.selectedVariant === (variantName || variantId))
            ? { ...item, quantity: item.quantity + quantity, price: itemPrice, compareAtPrice: itemCompareAtPrice, discountPrice: itemDiscountPrice }
            : item
        );
      }
      return [...prev, { ...product, price: itemPrice, compareAtPrice: itemCompareAtPrice, discountPrice: itemDiscountPrice, quantity, selectedVariant: variantName || variantId }];
    });

    toast.success(`${product.name} added to cart!`, {
      description: variantId ? `Variant: ${variantId}` : undefined,
      action: {
        label: 'View Cart',
        onClick: () => window.location.href = '/cart'
      }
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
  // Use Number() guard to protect against stale localStorage items with undefined prices
  const cartSubtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

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