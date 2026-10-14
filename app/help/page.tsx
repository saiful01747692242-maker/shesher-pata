'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../src/components/Header';
import { Footer } from '../../src/components/Footer';
import { CartDrawer } from '../../src/components/CartDrawer';
import { WishlistDrawer } from '../../src/components/WishlistDrawer';
import { CheckoutModal } from '../../src/components/CheckoutModal';
import { TrackOrderModal } from '../../src/components/TrackOrderModal';
import { AccountModal } from '../../src/components/AccountModal';
import { useData } from '../../src/context/DataContext';
import { useToast } from '../../src/context/ToastContext';
import { ShoppingBag, Search, Tag, Truck, CreditCard, User, Star, ChevronDown, HelpCircle, PackageCheck } from 'lucide-react';

export default function HelpPage() {
  const router = useRouter();
  const { siteSettings } = useData();
  const { showToast } = useToast();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const deliveryInside = siteSettings?.delivery_charge_inside || 60;
  const deliveryOutside = siteSettings?.delivery_charge_outside || 120;
  const phone = siteSettings?.phone || '০১৭০০-০০০০০০';

  const faqs = [
    {
      q: 'কীভাবে শেষের পাতা থেকে বই অর্ডার করব?',
      a: 'ওয়েবসাইটের যেকোনা বইয়ের নিচে "কার্টে যোগ করুন" বা "এখনই কিনুন" বাটনে ক্লিক করুন। এরপর চেকআউট ফর্মে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা লিখে "অর্ডার কনফার্ম করুন" বাটনে ক্লিক করলেই অর্ডার সম্পন্ন হবে।',
    },
    {
      q: 'বইয়ের মূল্য কীভাবে পরিশোধ করতে হয়?',
      a: 'আমরা সারা দেশে ক্যাশ অন ডেলিভারি (Cash on Delivery) সুবিধা প্রদান করি। কুরিয়ার প্রতিনিধি আপনার ঠিকানায় বই পৌঁছে দেওয়ার পর বই হাতে পেয়ে আপনি মূল্য পরিশোধ করতে পারবেন।',
    },
    {
      q: 'ডেলিভারি চার্জ কত এবং কতদিন সময় লাগে?',
      a: `ঢাকা সিটির ভেতরে ডেলিভারি চার্জ মাত্র ৳${deliveryInside} এবং সময় লাগে ১-২ কর্মদিবস। ঢাকা সিটির বাইরে দেশের যেকোনো জেলা বা উপজেলায় চার্জ ৳${deliveryOutside} এবং সময় লাগে ২-৪ কর্মদিবস।`,
    },
    {
      q: 'কুপন কোড কীভাবে ব্যবহার করতে হয়?',
      a: 'শপিং কার্ট ড্রয়ারে অথবা চেকআউট পেইজে "কুপন কোড দিন" ঘরে আপনার ডিসকাউন্ট কোডটি (যেমন: SHESHER10) লিখে "প্রয়োগ করুন" চাপলে সাথে সাথে আপনার অর্ডারে ছাড় যুক্ত হবে।',
    },
    {
      q: 'বইয়ের রিভিউ কীভাবে দেওয়া যায়?',
      a: 'পাঠকদের পর্যালোচনার বিশ্বস্ততা রক্ষায় শেষের পাতায় শুধুমাত্র ভেরিফায়েড ক্রেতাগণ (যারা ওয়েবসাইট থেকে বইটি ক্রয় করেছেন) রিভিউ প্রদান করতে পারেন। বইয়ের বিস্তারিত পাতায় "পাঠক রিভিউ" ট্যাবে গিয়ে রেটিং ও মতামত জমা দিতে পারেন।',
    },
    {
      q: 'অর্ডার ট্র্যাকিং কীভাবে করব?',
      a: 'ওয়েবসাইটের উপরে বা নিচে থাকা "অর্ডার ট্র্যাক করুন" বাটনে ক্লিক করে আপনার অর্ডার আইডি (যেমন: SP-2026-XXXXX) ও ফোন নম্বর প্রদান করে আপনার পার্সেলটির লাইভ স্ট্যাটাস দেখতে পারেন।',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
      <Header
        currentNav="help"
        onNavigate={(navId) => {
          if (navId === 'home') router.push('/');
          else if (['about', 'help', 'contact', 'terms', 'privacy'].includes(navId)) router.push('/' + navId);
          else router.push('/?category=' + encodeURIComponent(navId));
        }}
        onSearchSubmit={(q) => router.push('/?search=' + encodeURIComponent(q))}
        onSelectBook={(b) => router.push('/book/' + b.id)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
      />

      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-3 py-1 rounded-full uppercase tracking-wider">
              সহায়তা ও নির্দেশিকা
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900">
              কীভাবে আপনাকে সাহায্য করতে পারি?
            </h1>
            <div className="w-16 h-1 bg-[#F59E0B] rounded-full mx-auto" />
            <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed">
              বই খোঁজা, অর্ডার করা, ডেলিভারি ও অন্যান্য সাধারণ জিজ্ঞাসার সহজ সমাধান নিচে তুলে ধরা হলো।
            </p>
          </div>

          {/* Quick Guides Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center font-bold text-amber-800">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">অর্ডার করার পদ্ধতি</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                পছন্দের বই কার্টে যুক্ত করুন, ঠিকানা ও ফোন নম্বর প্রদান করুন এবং ক্যাশ অন ডেলিভারিতে অর্ডার সম্পন্ন করুন।
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center font-bold text-amber-800">
                <Search className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">বই ও লেখক সন্ধান</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                সার্চবারে বইয়ের নাম বা লেখকের নাম লিখুন। এছাড়া ক্যাটাগরি মেনু থেকে পছন্দের বিভাগ ব্রাউজ করতে পারেন।
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center font-bold text-amber-800">
                <Tag className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">কুপন কোড ব্যবহার</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                স্পেশাল কুপন কোড চেকআউটে প্রবেশ করিয়ে ডিসকাউন্ট গ্রহণ করুন। প্রতিটি কুপন স্বয়ংক্রিয়ভাবে ডিসকাউন্ট হিসাব করে।
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center font-bold text-amber-800">
                <Truck className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">ডেলিভারি ও চার্জ</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                ঢাকার ভেতরে ৳{deliveryInside}, ঢাকার বাইরে ৳{deliveryOutside}। স্টিডফাস্ট কুরিয়ারের মাধ্যমে নিরাপদে পার্সেল সরবরাহ করা হয়।
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center font-bold text-amber-800">
                <PackageCheck className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">লাইভ ট্র্যাকিং</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                যেকোনো সময় অর্ডার আইডি ও মোবাইল নম্বর দিয়ে আপনার পার্সেলের সর্বশেষ অগ্রগতি জানতে পারবেন।
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center font-bold text-amber-800">
                <Star className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">ভেরিফায়েড রিভিউ</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                বইটি সফলভাবে ক্রয় করার পর পাঠকরা ১-৫ স্টার রেটিং ও বিস্তারিত মন্তব্য শেয়ার করতে পারেন।
              </p>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-amber-600" />
              <span>সাধারণ প্রশ্নোত্তর (FAQ)</span>
            </h2>

            <div className="divide-y divide-zinc-100">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-3 sm:py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left gap-3 text-sm sm:text-base font-bold text-zinc-800 hover:text-amber-800 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-amber-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pt-2 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Need More Help Box */}
          <div className="p-6 rounded-3xl bg-[#FAF8F4] border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900">আরো কোনো প্রশ্ন বা সহায়তা প্রয়োজন?</h3>
              <p className="text-xs sm:text-sm text-zinc-600">আমাদের কাস্টমার কেয়ার টিম আপনাকে সহায়তা করতে প্রস্তুত।</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/contact')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer shadow-xs"
            >
              যোগাযোগ পেইজে যান
            </button>
          </div>
        </div>
      </main>

      <Footer
        onNavigate={(navId) => {
          if (navId === 'home') router.push('/');
          else if (['about', 'help', 'contact', 'terms', 'privacy'].includes(navId)) router.push('/' + navId);
          else router.push('/?category=' + encodeURIComponent(navId));
        }}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
      />

      <CartDrawer
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        onExploreBooks={() => router.push('/')}
      />

      <WishlistDrawer
        onExploreBooks={() => router.push('/')}
        onOpenDetails={(b) => router.push('/book/' + b.id)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={() => showToast('আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!', 'success')}
      />

      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onOpenOrders={() => setIsTrackOrderOpen(true)}
      />
    </div>
  );
}
