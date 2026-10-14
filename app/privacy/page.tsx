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
import { useToast } from '../../src/context/ToastContext';
import { ShieldCheck, Lock } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
      <Header
        currentNav="privacy"
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
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-3 py-1 rounded-full uppercase tracking-wider">
              নিরাপত্তা ও গোপনীয়তা
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900">
              গোপনীয়তা ও নিরাপত্তা নীতি (Privacy Policy)
            </h1>
            <div className="w-16 h-1 bg-[#F59E0B] rounded-full mx-auto" />
            <p className="text-sm text-zinc-500">সর্বশেষ আপডেট: অক্টোবর ২০২৬</p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-6 text-sm text-zinc-700 leading-relaxed">
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>১. তথ্য সংগ্রহ ও ব্যবহার</span>
              </h2>
              <p>
                আমরা আপনার ব্যক্তিগত তথ্য যেমন নাম, মোবাইল নম্বর, ইমেইল ও ডেলিভারি ঠিকানা শুধুমাত্র আপনার বই ডেলিভারি ও যোগাযোগ রক্ষার জন্য সংগ্রহ করি। আপনার সম্মতি ছাড়া এই তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করা হয় না।
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <span>২. তথ্যের নিরাপত্তা</span>
              </h2>
              <p>
                আমাদের প্ল্যাটফর্মে সকল গ্রাহক ডেটা এনক্রিপ্টেড ও সুরক্ষিত ডাটাবেজে সংরক্ষিত থাকে। পার্সেল ডেলিভারি নিশ্চিত করতে কেবল অনুমোদিত কুরিয়ার পার্টনারকে (যেমন: স্টিডফাস্ট কুরিয়ার) প্রয়োজনীয় শিপিং তথ্য (নাম, ফোন, ঠিকানা) প্রদান করা হয়।
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>৩. কুকিজ ও ট্র্যাকিং</span>
              </h2>
              <p>
                আপনার শপিং কার্টের বইসমূহ মনে রাখতে ও সাইটের পারফরম্যান্স বজায় রাখতে আধুনিক কুকিজ ও লোকাল স্টোরেজ প্রযুক্তি ব্যবহার করা হয়।
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <span>৪. যোগাযোগের অধিকার</span>
              </h2>
              <p>
                আপনার তথ্য সম্পর্কিত যেকোনো সংশোধন, মুছে ফেলা বা অভিযোগের জন্য আমাদের কাস্টমার কেয়ারে ইমেইল (support@shesherpata.com) করতে পারেন।
              </p>
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
