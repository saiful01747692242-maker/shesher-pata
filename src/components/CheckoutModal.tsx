'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ShieldCheck, Truck, Banknote, ArrowRight, Printer, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { OrderDetails, CartItem } from '../types';
import { formatPrice, toBengaliNumber } from '../utils/formatters';
import { trackInitiateCheckout, trackPurchase } from '../utils/metaPixel';
import { couponService } from '../services/couponService';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: () => void;
  directItem?: CartItem | null;
}

const DISTRICTS = [
  'ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ',
  'কুমিল্লা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'বগুড়া', 'দিনাজপুর', 'ফরিদপুর', 'যশোর', 'কুষ্টিয়া'
];

const CUSTOMER_INFO_KEY = 'shesher_pata_checkout_info';
const BUY_NOW_STORAGE_KEY = 'shesher_pata_buy_now';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  directItem,
}) => {
  const { user, profile } = useAuth();
  const { addOrder, siteSettings } = useData();
  const {
    cart,
    clearCart,
    subtotal: cartSubtotal,
    discountAmount: cartDiscountAmount,
    couponCode: cartCouponCode,
    deliveryOption,
    setDeliveryOption,
    insideDhakaFee,
    outsideDhakaFee,
    freeDeliveryThreshold,
    grandTotal: cartGrandTotal,
  } = useCart();

  // Session-persisted directItem (restored on page refresh or navigation)
  const [persistedDirectItem, setPersistedDirectItem] = useState<CartItem | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (directItem) {
      setPersistedDirectItem(directItem);
    } else if (isOpen) {
      try {
        const stored = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.book && parsed.quantity) {
            setPersistedDirectItem(parsed);
          }
        }
      } catch {}
    } else {
      setPersistedDirectItem(null);
    }
  }, [isOpen, directItem]);

  // Active items being purchased
  const isDirectBuy = Boolean(directItem || persistedDirectItem);
  const activeDirectItem = directItem || persistedDirectItem;
  const activeItems: CartItem[] = useMemo(() => {
    if (isDirectBuy && activeDirectItem) {
      return [activeDirectItem];
    }
    return cart;
  }, [isDirectBuy, activeDirectItem, cart]);

  // Dynamic pricing calculations for active items
  const activeSubtotal = useMemo(() => {
    return activeItems.reduce(
      (sum, item) => sum + (Number(item.book.price) || 0) * (Number(item.quantity) || 1),
      0
    );
  }, [activeItems]);

  const activeCouponCode = isDirectBuy ? '' : cartCouponCode;
  const activeDiscountAmount = isDirectBuy ? 0 : cartDiscountAmount;

  const isFreeDelivery = freeDeliveryThreshold > 0 && activeSubtotal >= freeDeliveryThreshold;
  const activeDeliveryFee = activeItems.length === 0
    ? 0
    : isFreeDelivery
    ? 0
    : deliveryOption === 'inside_dhaka'
    ? insideDhakaFee
    : outsideDhakaFee;

  const activeGrandTotal = Math.max(0, activeSubtotal - activeDiscountAmount + activeDeliveryFee);

  // Form State with stored customer info restoration
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('ঢাকা');
  const [thana, setThana] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const paymentMethod = 'cod';
  const [orderNotes, setOrderNotes] = useState('');

  // Restore saved customer details from localStorage or user profile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedInfoStr = localStorage.getItem(CUSTOMER_INFO_KEY);
      if (savedInfoStr) {
        const info = JSON.parse(savedInfoStr);
        if (info.name && !name) setName(info.name);
        if (info.phone && !phone) setPhone(info.phone);
        if (info.email && !email) setEmail(info.email);
        if (info.address && !address) setAddress(info.address);
        if (info.district) setDistrict(info.district);
        if (info.thana && !thana) setThana(info.thana);
        if (info.postalCode && !postalCode) setPostalCode(info.postalCode);
      }
    } catch {}

    if (profile || user) {
      if (profile?.name && !name) setName(profile.name);
      if (profile?.phone && !phone) setPhone(profile.phone);
      if (user?.email && !email) setEmail(user.email);
    }
  }, [profile, user]);

  // Save customer form info locally so refresh does not clear user inputs
  const persistCustomerInfo = (updates: Partial<{ name: string; phone: string; email: string; address: string; district: string; thana: string; postalCode: string }>) => {
    if (typeof window === 'undefined') return;
    try {
      const current = {
        name,
        phone,
        email,
        address,
        district,
        thana,
        postalCode,
        ...updates,
      };
      localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(current));
    } catch {}
  };

  // Order Complete State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Track InitiateCheckout once per checkout open
  const hasInitiatedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !completedOrderId && activeItems.length > 0 && !hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      trackInitiateCheckout(activeItems, activeGrandTotal);
    }
    if (!isOpen) {
      hasInitiatedRef.current = false;
      setCompletedOrderId(null);
      setCompletedOrder(null);
      setFormError(null);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen, completedOrderId, activeItems, activeGrandTotal]);

  if (!isOpen) return null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate orders caused by repeated clicks, retries, or accidental double submissions
    if (isSubmitting || isSubmittingRef.current) {
      return;
    }

    if (!name.trim() || !phone.trim() || !address.trim()) {
      setFormError('দয়া করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা প্রদান করুন।');
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d+০-৯]/g, '');
    if (cleanPhone.length < 11) {
      setFormError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }

    if (activeItems.length === 0) {
      setFormError('কোনো বই নির্বাচন করা হয়নি!');
      return;
    }

    // Validate availability and stock
    for (const item of activeItems) {
      if (item.book.stock !== undefined && item.book.stock <= 0) {
        setFormError(`দুঃখিত! "${item.book.title}" বইটি বর্তমানে স্টকে নেই।`);
        return;
      }
      if (item.quantity <= 0) {
        setFormError('বইয়ের সংখ্যা কমপক্ষে ১ হতে হবে।');
        return;
      }
      if (item.book.stock !== undefined && item.quantity > item.book.stock) {
        setFormError(`দুঃখিত! "${item.book.title}" বইটির শুধুমাত্র ${toBengaliNumber(item.book.stock)} টি কপি স্টকে উপলব্ধ আছে।`);
        return;
      }
    }

    setFormError(null);
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const orderId = `SP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const newOrder: OrderDetails = {
        orderId,
        date: new Date().toLocaleDateString('bn-BD'),
        created_at: new Date().toISOString(),
        customerName: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        userId: user?.id || undefined,
        address: address.trim(),
        district,
        thana: thana.trim(),
        postalCode: postalCode.trim(),
        deliveryOption,
        deliveryFee: activeDeliveryFee,
        paymentMethod: 'cod',
        items: activeItems.map((it) => ({
          book: {
            ...it.book,
            id: it.book.id,
            title: it.book.title,
            price: Number(it.book.price) || 0,
            originalPrice: Number(it.book.originalPrice) || Number(it.book.price) || 0,
            image: it.book.image || it.book.cover_image || '',
            cover_image: it.book.cover_image || it.book.image || '',
            author: it.book.author || '',
          },
          quantity: it.quantity,
        })),
        subtotal: activeSubtotal,
        discountAmount: activeDiscountAmount,
        couponCode: activeCouponCode || undefined,
        total: activeGrandTotal,
        status: 'pending',
        orderNotes: orderNotes.trim(),
      };

      // Persist order in Supabase PostgreSQL
      const result = await orderService.createOrder(newOrder, user?.id);
      if (!result.success) {
        setFormError(result.error || 'অর্ডার সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      // Add to local state and update pixel
      addOrder(newOrder);
      trackPurchase(newOrder);

      // Record coupon usage if applicable
      if (activeCouponCode) {
        couponService.recordUsage(activeCouponCode, orderId).catch(() => {});
      }

      // Clean up Buy Now session, while preserving regular cart
      if (isDirectBuy) {
        try {
          sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
        } catch {}
        setPersistedDirectItem(null);
      } else {
        // Standard checkout: clear cart
        clearCart();
      }

      setCompletedOrder(newOrder);
      setCompletedOrderId(orderId);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      onOrderSuccess();
    } catch (err: any) {
      console.error('[CheckoutModal Error]:', err);
      setFormError(err?.message || 'অর্ডার প্রক্রিয়া করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 font-['Noto_Sans_Bengali']">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 my-auto max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-[#FAF8F4]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                {isDirectBuy ? 'এখনই কিনুন — সরাসরি নিরাপদ অর্ডার' : 'শেষের পাতা — নিরাপদ অর্ডার'}
              </h2>
              <span className="text-xs text-zinc-500">
                ক্যাশ অন ডেলিভারি সুবিধা (বই হাতে পেয়ে মূল্য পরিশোধ)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {completedOrderId ? (
            /* Order Success View */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-10 h-10 stroke-[2]" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  অর্ডার সফলভাবে গ্রহণ করা হয়েছে
                </span>
                <h3 className="text-2xl font-black text-zinc-900 mt-2">
                  ধন্যবাদ, {name}!
                </h3>
                <p className="text-sm text-zinc-600 mt-1 max-w-md mx-auto">
                  আপনার অর্ডার নম্বর: <strong className="text-amber-800 font-mono text-base">{completedOrderId}</strong>।
                  আমাদের প্রতিনিধি দ্রুত আপনার সাথে ফোনে যোগাযোগ করবেন।
                </p>
              </div>

              {/* Order summary invoice receipt */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#FAF8F4] border border-zinc-200 text-left text-xs space-y-2.5">
                <div className="flex justify-between border-b border-zinc-200/80 pb-2">
                  <span className="text-zinc-500">গ্রাহকের নাম:</span>
                  <span className="font-semibold text-zinc-900">{name}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/80 pb-2">
                  <span className="text-zinc-500">মোবাইল নম্বর:</span>
                  <span className="font-semibold text-zinc-900">{phone}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/80 pb-2">
                  <span className="text-zinc-500">ডেলিভারি ঠিকানা:</span>
                  <span className="font-semibold text-zinc-900 text-right max-w-[240px]">{address}, {thana ? `${thana}, ` : ''}{district}</span>
                </div>

                {/* Purchased Books Receipt Details */}
                <div className="border-b border-zinc-200/80 pb-2 space-y-1.5">
                  <span className="text-zinc-500 block font-medium">অর্ডারকৃত বই:</span>
                  {completedOrder?.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-zinc-800">
                      <span className="truncate pr-2 font-semibold">
                        {it.book?.title} <span className="text-zinc-400 font-normal">({toBengaliNumber(it.quantity)}টি)</span>
                      </span>
                      <span className="font-mono text-zinc-900 font-bold shrink-0">
                        {formatPrice((Number(it.book?.price) || 0) * (it.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-b border-zinc-200/80 pb-2">
                  <span className="text-zinc-500">পেমেন্ট মেথড:</span>
                  <span className="font-semibold text-zinc-900">
                    ক্যাশ অন ডেলিভারি (বই পেয়ে টাকা পরিশোধ)
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold text-zinc-950">
                  <span>সর্বমোট প্রদেয়:</span>
                  <span className="text-amber-800 text-base">{formatPrice(completedOrder?.total || activeGrandTotal)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>রসিদ প্রিন্ট করুন</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs sm:text-sm font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  আরও বই দেখুন
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Customer and Shipping Details */}
                <div className="md:col-span-7 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>ডেলিভারি তথ্য</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">
                        আপনার পুরো নাম <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          persistCustomerInfo({ name: e.target.value });
                        }}
                        placeholder="যেমন: সাকিব আল হাসান"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">
                          মোবাইল নম্বর <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            persistCustomerInfo({ phone: e.target.value });
                          }}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">
                          ইমেইল এড্রেস (ঐচ্ছিক)
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            persistCustomerInfo({ email: e.target.value });
                          }}
                          placeholder="yourname@gmail.com"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">
                        সম্পূর্ণ ঠিকানা (বাসা/রোড/এলাকা) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          persistCustomerInfo({ address: e.target.value });
                        }}
                        placeholder="যেমন: বাসা নং ১২, রোড নং ৪, ধানমন্ডি, ঢাকা"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">জেলা</label>
                        <select
                          value={district}
                          onChange={(e) => {
                            const newDist = e.target.value;
                            setDistrict(newDist);
                            persistCustomerInfo({ district: newDist });
                            if (newDist === 'ঢাকা') {
                              setDeliveryOption('inside_dhaka');
                            } else {
                              setDeliveryOption('outside_dhaka');
                            }
                          }}
                          className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white text-xs outline-none"
                        >
                          {DISTRICTS.map((dist) => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">থানা / উপজেলা</label>
                        <input
                          type="text"
                          value={thana}
                          onChange={(e) => {
                            setThana(e.target.value);
                            persistCustomerInfo({ thana: e.target.value });
                          }}
                          placeholder="যেমন: ধানমন্ডি"
                          className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">পোস্ট কোড</label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => {
                            setPostalCode(e.target.value);
                            persistCustomerInfo({ postalCode: e.target.value });
                          }}
                          placeholder="১২০৯"
                          className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 bg-zinc-50 focus:bg-white text-xs outline-none"
                        />
                      </div>
                    </div>

                    {/* Delivery zone radio */}
                    <div className="pt-2">
                      <label className="block font-semibold text-zinc-700 mb-1.5">
                        ডেলিভারি এলাকা
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          onClick={() => setDeliveryOption('inside_dhaka')}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${
                            deliveryOption === 'inside_dhaka'
                              ? 'border-amber-500 bg-amber-50/50 font-bold text-amber-950'
                              : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                          }`}
                        >
                          <span>ঢাকা সিটির ভিতরে</span>
                          <span className="text-zinc-500 font-semibold">{formatPrice(insideDhakaFee)}</span>
                        </label>

                        <label
                          onClick={() => setDeliveryOption('outside_dhaka')}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${
                            deliveryOption === 'outside_dhaka'
                              ? 'border-amber-500 bg-amber-50/50 font-bold text-amber-950'
                              : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                          }`}
                        >
                          <span>ঢাকার বাইরে</span>
                          <span className="text-zinc-500 font-semibold">{formatPrice(outsideDhakaFee)}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Payment & Order Summary */}
                <div className="md:col-span-5 space-y-4">
                  {/* Payment Options */}
                  <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>পেমেন্ট পদ্ধতি</span>
                  </h3>

                  <div className="text-xs">
                    <div className="p-3.5 rounded-2xl border-2 border-amber-500 bg-amber-50/70 text-zinc-900 shadow-xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-zinc-900 text-xs sm:text-sm">ক্যাশ অন ডেলিভারি (COD)</span>
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full shrink-0">
                            প্রযোজ্য
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-600 block mt-0.5">
                          বই হাতে পেয়ে দেখে মূল্য পরিশোধ করুন
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Financials Summary */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200">
                      <span className="font-bold text-zinc-900">
                        {isDirectBuy ? 'নির্বাচিত বই' : 'অর্ডার সামারি'} ({toBengaliNumber(activeItems.length)} টি)
                      </span>
                      {isDirectBuy && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          সরাসরি ক্রয়
                        </span>
                      )}
                    </div>

                    {/* Book Items List in Checkout */}
                    <div className="max-h-36 overflow-y-auto space-y-2 py-1 pr-1 border-b border-zinc-200">
                      {activeItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={item.book.cover_image || item.book.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&h=560&q=80'}
                              alt={item.book.title}
                              className="w-8 h-10 object-cover rounded border border-zinc-200 shrink-0 bg-white"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-zinc-900 text-[11px] truncate leading-tight">
                                {item.book.title}
                              </h4>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {item.book.author}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-zinc-900 font-bold block text-xs">
                              {formatPrice((Number(item.book.price) || 0) * (item.quantity || 1))}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {toBengaliNumber(item.quantity)} টি × {formatPrice(item.book.price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-zinc-600 pt-1">
                      <span>সাবটোটাল</span>
                      <span className="font-semibold text-zinc-900">{formatPrice(activeSubtotal)}</span>
                    </div>

                    {activeDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>কুপন ছাড় ({activeCouponCode})</span>
                        <span>-{formatPrice(activeDiscountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-zinc-600">
                      <span>ডেলিভারি চার্জ</span>
                      <span className="font-semibold text-zinc-900">{formatPrice(activeDeliveryFee)}</span>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-extrabold text-zinc-950">
                      <span>সর্বমোট</span>
                      <span className="text-amber-800 text-base">{formatPrice(activeGrandTotal)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || activeItems.length === 0}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-zinc-950 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>অর্ডার নিশ্চিত করুন</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
