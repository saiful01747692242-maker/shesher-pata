'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Package, Truck, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { toBengaliNumber, formatPrice } from '../utils/formatters';
import { useData } from '../context/DataContext';
import { OrderDetails } from '../types';
import { orderService } from '../services/orderService';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ isOpen, onClose }) => {
  const { orders } = useData();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState<OrderDetails | null>(null);

  if (!isOpen) return null;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) return;
    const normalizedOrderId = orderId.trim().toLowerCase();
    const normalizedPhone = phone.trim().replace(/\\s+/g, '');
    const found = orders.find(
      (o) => o.orderId.toLowerCase() === normalizedOrderId && o.phone.replace(/\\s+/g, '') === normalizedPhone
    );
    if (found) {
      setMatchedOrder(found);
      setSearched(true);
      return;
    }

    setIsLoading(true);
    try {
      const serverOrders = await orderService.fetchCustomerOrders({
        orderId: orderId.trim(),
        phone: phone.trim(),
      });
      if (serverOrders && serverOrders.length > 0) {
        setMatchedOrder(serverOrders[0]);
      } else {
        setMatchedOrder(null);
      }
    } catch {
      setMatchedOrder(null);
    } finally {
      setIsLoading(false);
      setSearched(true);
    }
  };

  const statusBengali: Record<string, { label: string; color: string }> = {
    pending: { label: 'অর্ডার প্রক্রিয়াধীন (Pending)', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    confirmed: { label: 'অর্ডার নিশ্চিত করা হয়েছে (Confirmed)', color: 'bg-blue-100 text-blue-900 border-blue-300' },
    shipped: { label: 'কুরিয়ারে হস্তান্তর হয়েছে (Shipped)', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
    delivered: { label: 'ডেলিভারি সম্পন্ন (Delivered)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    cancelled: { label: 'অর্ডার বাতিল (Cancelled)', color: 'bg-rose-100 text-rose-900 border-rose-300' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center">
            <Truck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">অর্ডার ট্র্যাক করুন</h3>
            <p className="text-xs text-zinc-500">আপনার অর্ডার নম্বর বা ফোন নম্বর দিয়ে স্থিতি জানুন</p>
          </div>
        </div>

        <form onSubmit={handleTrack} className="flex gap-2 mb-6">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="অর্ডার নম্বর (যেমন: SP-2026-89421)"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="অর্ডারের সময় ব্যবহৃত মোবাইল নম্বর"
              required
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>খুঁজুন</span>
          </button>
        </form>

        {searched ? (
          matchedOrder ? (
            <div className="space-y-4 pt-2 border-t border-zinc-100">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-wrap justify-between items-center gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 block">অর্ডার আইডি:</span>
                  <span className="font-bold text-zinc-900">{matchedOrder.orderId}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-bold border ${statusBengali[matchedOrder.status]?.color || 'bg-zinc-100 text-zinc-800'}`}>
                  {statusBengali[matchedOrder.status]?.label || matchedOrder.status}
                </span>
              </div>

              {/* Customer & Delivery Summary */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 text-xs space-y-1">
                <p><span className="text-zinc-500">গ্রাহক:</span> <strong className="text-zinc-800">{matchedOrder.customerName}</strong> ({matchedOrder.phone})</p>
                <p><span className="text-zinc-500">ঠিকানা:</span> {matchedOrder.address}, {matchedOrder.thana}, {matchedOrder.district}</p>
                <p><span className="text-zinc-500">মোট মূল্য:</span> <strong className="text-amber-700">{formatPrice(matchedOrder.total)}</strong> ({matchedOrder.paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি' : matchedOrder.paymentMethod.toUpperCase()})</p>
                <p><span className="text-zinc-500">বইসমূহ:</span> {matchedOrder.items.map(i => `${i.book.title} (x${toBengaliNumber(i.quantity)})`).join(', ')}</p>
              </div>

              {matchedOrder.steadfast_tracking_code && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-emerald-700 font-semibold block">স্টেডফাস্ট ট্র্যাকিং কোড:</span>
                    <span className="font-mono font-bold text-emerald-950">{matchedOrder.steadfast_tracking_code}</span>
                  </div>
                  <a
                    href={`https://steadfast.com.bd/tracking?q=${encodeURIComponent(matchedOrder.steadfast_tracking_code)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>লাইভ ট্র্যাক</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Tracking Milestones based on status */}
              <div className="space-y-3 pl-2 text-xs">
                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    ['pending', 'confirmed', 'shipped', 'delivered'].includes(matchedOrder.status)
                      ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-400'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">অর্ডার গ্রহণ করা হয়েছে</h4>
                    <p className="text-zinc-500 text-[11px]">{matchedOrder.date}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    ['confirmed', 'shipped', 'delivered'].includes(matchedOrder.status)
                      ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-400'
                  }`}>
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">প্যাকেজিং ও প্রস্তুতি</h4>
                    <p className="text-zinc-500 text-[11px]">
                      {['confirmed', 'shipped', 'delivered'].includes(matchedOrder.status)
                        ? 'নিশ্চিত করা হয়েছে এবং মোড়কজাত সম্পন্ন'
                        : 'অপেক্ষমাণ...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    ['shipped', 'delivered'].includes(matchedOrder.status)
                      ? 'bg-amber-500 text-white animate-pulse' : 'bg-zinc-200 text-zinc-400'
                  }`}>
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">কুরিয়ার ডেলিভারি রাইডারের পথে</h4>
                    <p className="text-zinc-500 text-[11px]">
                      {['shipped', 'delivered'].includes(matchedOrder.status)
                        ? 'ডেলিভারি পার্টনারের মাধ্যমে প্রেরিত হয়েছে'
                        : 'শিগগিরই কুরিয়ারে হস্তান্তর করা হবে'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 relative">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    matchedOrder.status === 'delivered'
                      ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-400'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">ডেলিভারি সম্পন্ন</h4>
                    <p className="text-zinc-500 text-[11px]">
                      {matchedOrder.status === 'delivered' ? 'সফলভাবে গ্রাহকের হাতে পৌঁছে দেওয়া হয়েছে' : '২৪-৭২ ঘণ্টার মধ্যে সরবরাহ করা হবে'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-500 text-xs space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
              <p className="font-bold text-zinc-800">কোনো অর্ডার পাওয়া যায়নি!</p>
              <p className="text-zinc-400">"{orderId}" নম্বর দিয়ে কোনো অর্ডার নথিভুক্ত নেই। সঠিক নম্বর লিখে আবার চেষ্টা করুন।</p>
            </div>
          )
        ) : (
          <div className="text-center py-6 text-zinc-400 text-xs">
            <Package className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p>আপনার অর্ডার নম্বর বা মোবাইল নম্বর দিয়ে খুঁজুন</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
