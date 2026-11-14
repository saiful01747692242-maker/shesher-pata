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
import { BookOpen, ShieldCheck, Truck, HeartHandshake, MapPin, Phone, Mail, Clock, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();
  const { siteSettings } = useData();
  const { showToast } = useToast();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const phone = siteSettings?.phone || '+8801747692242';
  const email = siteSettings?.email || 'support@shesherpata.com';
  const address = siteSettings?.address || 'Mirpur 14, Dhaka, Bangladesh';
  const hours = siteSettings?.support_hours || 'সকাল ৯টা - রাত ১০টা';
  const aboutText = siteSettings?.about_text || '"শেষের পাতা" বাংলাদেশের একটি নির্ভরযোগ্য অনলাইন বইয়ের প্ল্যাটফর্ম। দেশি-বিদেশি অমর সাহিত্যকর্ম, আধুনিক অনুবাদ এবং জনপ্রিয় প্রকাশনীর বই সরাসরি পাঠকদের ঠিকানায় পৌঁছে দেওয়াই আমাদের মূল লক্ষ্য।';

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
      <Header
        currentNav="about"
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
          {/* Header Title */}
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-3 py-1 rounded-full uppercase tracking-wider">
              বইপ্রেমীদের নির্ভরযোগ্য ঠিকানা
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900">
              আমাদের সম্পর্কে
            </h1>
            <div className="w-16 h-1 bg-[#F59E0B] rounded-full mx-auto" />
            <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto leading-relaxed">
              পাঠকের হাতে আসল বই, সঠিক সময়ে এবং সর্বোচ্চ যত্নে পৌঁছে দিতে আমরা প্রতিশ্রুতিবদ্ধ।
            </p>
          </div>

          {/* Core Story & Description */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-600" />
              <span>শেষের পাতার গল্প ও লক্ষ্য</span>
            </h2>
            <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">
              {aboutText}
            </p>
            <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">
              আমরা বিশ্বাস করি বই কেবল তথ্যের উৎস নয়, এটি জীবনের দিকনির্দেশনা ও মানসিক প্রশান্তির সঙ্গী। আমাদের সংগ্রহে রয়েছে চিরায়ত বাংলা ক্লাসিক, উপন্যাস, থ্রিলার ও রহস্য, কবিতা, ইসলামিক সাহিত্য, শিশু-কিশোর বই, এবং বিশ্বসাহিত্যের সেরা অনুবাদগ্রন্থ।
            </p>
          </div>

          {/* What We Offer / Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">১০০% আসল বই</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                সরাসরি মূল প্রকাশনী থেকে সংগৃহীত অরিজিনাল ও মানসম্মত প্রিন্টের বই।
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">সারা দেশে ডেলিভারি</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                ঢাকা সহ দেশের প্রতিটি জেলা ও উপজেলায় দ্রুত ও নিরাপদ কুরিয়ার হোম ডেলিভারি সুবিধা।
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center font-bold">
                <HeartHandshake className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-base text-zinc-900">ক্যাশ অন ডেলিভারি</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                কোনো অগ্রিম পেমেন্টের ঝুঁকি ছাড়া বই হাতে পেয়ে মূল্য পরিশোধের সুবিধা।
              </p>
            </div>
          </div>

          {/* Contact & Support Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#FAF8F4] border border-amber-200/80 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
              আমাদের সাথে যোগাযোগের তথ্য
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-zinc-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 block">ঠিকানা:</span>
                  <span>{address}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 block">হেল্পলাইন:</span>
                  <span>{phone}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 block">ইমেইল:</span>
                  <span>{email}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 block">সাপোর্ট সময়সূচি:</span>
                  <span>{hours}</span>
                </div>
              </div>
            </div>
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
