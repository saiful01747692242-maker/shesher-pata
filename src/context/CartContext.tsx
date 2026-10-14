'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Book, CartItem } from '../types';
import { useToast } from './ToastContext';
import { useData } from './DataContext';
import { trackAddToCart } from '../utils/metaPixel';
import { couponService } from '../services/couponService';

interface CartContextType {
  cart: CartItem[];
  addToCart: (book: Book, quantity?: number) => void;
  removeFromCart: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  discountAmount: number;
  couponCode: string;
  couponDiscountPercentage: number;
  applyCoupon: (code: string) => Promise<boolean> | boolean;
  removeCoupon: () => void;
  deliveryOption: 'inside_dhaka' | 'outside_dhaka';
  setDeliveryOption: (option: 'inside_dhaka' | 'outside_dhaka') => void;
  deliveryFee: number;
  insideDhakaFee: number;
  outsideDhakaFee: number;
  freeDeliveryThreshold: number;
  grandTotal: number;
  totalItemsCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'shesher_pata_cart_items';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscountPercentage, setCouponDiscountPercentage] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed' | 'free_shipping';
    discount_value: number;
    discount_amount: number;
    minimum_order_amount: number;
    maximum_discount_amount: number | null;
  } | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Read initial cart on client mount to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save cart changes to localStorage after mounting
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart, isMounted]);

  const addToCart = (book: Book, quantity = 1) => {
    if (book.stock <= 0) {
      showToast(`দুঃখিত! "${book.title}" বইটি বর্তমানে স্টকে নেই`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id);
      if (existing) {
        const targetQty = existing.quantity + quantity;
        if (book.stock && targetQty > book.stock) {
          showToast(`দুঃখিত! স্টকে শুধুমাত্র ${book.stock} টি কপি উপলব্ধ আছে`, 'error');
          return prev.map((item) =>
            item.book.id === book.id
              ? { ...item, quantity: book.stock }
              : item
          );
        }
        return prev.map((item) =>
          item.book.id === book.id
            ? { ...item, quantity: targetQty }
            : item
        );
      }
      return [...prev, { book, quantity: Math.min(quantity, book.stock || 1) }];
    });

    showToast(`"${book.title}" বইটি কার্টে যোগ হয়েছে ✓`, 'success');
    trackAddToCart(book, quantity);
  };

  const removeFromCart = (bookId: string) => {
    const item = cart.find((i) => i.book.id === bookId);
    setCart((prev) => prev.filter((item) => item.book.id !== bookId));
    if (item) {
      showToast(`"${item.book.title}" কার্ট থেকে সরানো হয়েছে`, 'info');
    }
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    const item = cart.find((i) => i.book.id === bookId);
    let finalQty = quantity;
    if (item && item.book.stock !== undefined && quantity > item.book.stock) {
      showToast(`দুঃখিত! স্টকে শুধুমাত্র ${item.book.stock} টি কপি উপলব্ধ আছে`, 'error');
      finalQty = item.book.stock;
    }
    setCart((prev) =>
      prev.map((it) =>
        it.book.id === bookId ? { ...it, quantity: finalQty } : it
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return false;

    try {
      const res = await couponService.validateCoupon(normalized, subtotal);
      if (res.valid && res.coupon) {
        setCouponCode(res.coupon.code);
        setCouponDiscountPercentage(res.coupon.discount_value);
        setAppliedCoupon(res.coupon);
        showToast(res.message || `${res.coupon.code} কুপন ডিসকাউন্ট প্রয়োগ করা হয়েছে! 🎉`, 'success');
        return true;
      } else {
        showToast(res.error || 'দুঃখিত! কুপন কোডটি সঠিক নয়।', 'error');
        return false;
      }
    } catch {
      showToast('কুপন যাচাইয়ে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
      return false;
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscountPercentage(0);
    setAppliedCoupon(null);
    showToast('কুপন কোড সরানো হয়েছে', 'info');
  };

  const { siteSettings } = useData();

  // Dynamic delivery fees configured by admin
  const insideDhakaFee = typeof siteSettings?.delivery_charge_inside === 'number'
    ? siteSettings.delivery_charge_inside
    : 60;
  const outsideDhakaFee = typeof siteSettings?.delivery_charge_outside === 'number'
    ? siteSettings.delivery_charge_outside
    : 120;
  const freeDeliveryThreshold = typeof siteSettings?.free_delivery_threshold === 'number'
    ? siteSettings.free_delivery_threshold
    : 1500;

  // Subtotal calculated with current book price
  const subtotal = cart.reduce((acc, item) => acc + item.book.price * item.quantity, 0);

  // Additional coupon discount calculated server-side or with active limits
  let discountAmount = 0;
  if (appliedCoupon && couponCode) {
    if (appliedCoupon.minimum_order_amount > 0 && subtotal < appliedCoupon.minimum_order_amount) {
      discountAmount = 0;
    } else if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = Math.round((subtotal * appliedCoupon.discount_value) / 100);
      if (appliedCoupon.maximum_discount_amount && discountAmount > appliedCoupon.maximum_discount_amount) {
        discountAmount = appliedCoupon.maximum_discount_amount;
      }
    } else if (appliedCoupon.discount_type === 'fixed') {
      discountAmount = Math.min(appliedCoupon.discount_value, subtotal);
    }
  } else if (couponDiscountPercentage > 0) {
    discountAmount = Math.round((subtotal * couponDiscountPercentage) / 100);
  }

  // Delivery fee: calculated dynamically based on admin configuration
  const isFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;
  const deliveryFee = cart.length === 0 ? 0 : isFreeDelivery ? 0 : deliveryOption === 'inside_dhaka' ? insideDhakaFee : outsideDhakaFee;

  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        discountAmount,
        couponCode,
        couponDiscountPercentage,
        applyCoupon,
        removeCoupon,
        deliveryOption,
        setDeliveryOption,
        deliveryFee,
        insideDhakaFee,
        outsideDhakaFee,
        freeDeliveryThreshold,
        grandTotal,
        totalItemsCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
