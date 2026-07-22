'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  stockQuantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('shofy_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        localStorage.removeItem('shofy_cart');
      }
    }
  }, []);

  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('shofy_cart', JSON.stringify(items));
  };

  const addToCart = (newItem: Omit<CartItem, 'quantity'>, quantity: number) => {
    const existingIndex = cartItems.findIndex((item) => item.variantId === newItem.variantId);
    let updatedItems = [...cartItems];

    if (existingIndex > -1) {
      const currentQty = updatedItems[existingIndex].quantity;
      const newQty = Math.min(currentQty + quantity, newItem.stockQuantity);
      updatedItems[existingIndex].quantity = newQty;
    } else {
      updatedItems.push({ ...newItem, quantity: Math.min(quantity, newItem.stockQuantity) });
    }

    saveCart(updatedItems);
  };

  const removeFromCart = (variantId: string) => {
    const updatedItems = cartItems.filter((item) => item.variantId !== variantId);
    saveCart(updatedItems);
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    const updatedItems = cartItems.map((item) => {
      if (item.variantId === variantId) {
        const validatedQty = Math.max(1, Math.min(quantity, item.stockQuantity));
        return { ...item, quantity: validatedQty };
      }
      return item;
    });
    saveCart(updatedItems);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
