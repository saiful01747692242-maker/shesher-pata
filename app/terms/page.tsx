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
import { FileText, CheckCircle2 } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
      <Header
        currentNav="terms"
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
              নীতিমালা ও শর্তাবলী
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900">
              শর্তাবলী ও নিয়মাবলী (Terms of Service)
            </h1>
            <div className="w-16 h-1 bg-[#F59E0B] rounded-full mx-auto" />
            <p className="text-sm text-zinc-500">সর্বশেষ আপডেট: অক্টোবর ২০২৬</p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-6 text-sm text-zinc-700 leading-relaxed">
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>১. সাধারণ নিয়ম ও গ্রহণযোগ্যতা</span>
              </h2>
              <p>
                "শেষের পাতা" (shesherpata.com) ব্যবহারের মাধ্যমে আপনি আমাদের সকল নিয়ম ও শর্তাবলি মেনে নিতে সম্মত হচ্ছেন। আমরা যেকোনো সময় কোনো পূর্ব নোটিশ ছাড়াই এসব নিয়মাবলী সংশোধন বা আপডেট করার অধিকার সংরক্ষণ করি।
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>২. বইয়ের মূল্য ও স্টক</span>
              </h2>
              <p>
                ওয়েবসাইটে প্রদর্শিত প্রতিটি বইয়ের মূল্য বাংলাদেশ টাকায় (৳) নির্ধারিত। বইয়ের স্টক নিয়মিত আপডেট করা হয়। যদি অনাকাঙ্ক্ষিতভাবে অর্ডার গ্রহণের পর কোনো বই আউট অব স্টক হয়ে যায়, গ্রাহককে অতি দ্রুত ফোনে বা এসএমএসে জানিয়ে বিকল্প ব্যবস্থা গ্রহণ করা হবে।
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>৩. ডেলিভারি ও পেমেন্ট পলিসি</span>
              </h2>
              <p>
                আমরা ক্যাশ অন ডেলিভারি (বই পেয়ে টাকা পরিশোধ) সুবিধা প্রদান করি। ঢাকা সিটির ভেতরে সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৪ দিনের মধ্যে স্টিডফাস্ট কুরিয়ারের মাধ্যমে ডেলিভারি সম্পন্ন হয়।
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>৪. রিটার্ন ও রিপ্লেসমেন্ট পলিসি</span>
              </h2>
              <p>
                যদি ডেলিভারির সময় বইয়ে কোনো প্রিন্টিং ক্রটি, মিসিং পেইজ বা বাঁধাইয়ের সমস্যা ধরা পড়ে, তবে ডেলিভারির ৩ দিনের মধ্যে আমাদের কাস্টমার কেয়ারে জানালে সম্পূর্ণ বিনামূল্যে বইটি পরিবর্তন (রিপ্লেস) করে দেওয়া হবে।
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>৫. পাঠক রিভিউ নীতিমালা</span>
              </h2>
              <p>
                পাঠক রিভিউ ব্যবস্থার সততা ও মান রক্ষার্থে কেবলমাত্র শেষের পাতা থেকে বইটি সফলভাবে ক্রয়কারী সম্মানিত গ্রাহকগণ বইটিতে রেটিং ও মন্তব্য প্রদান করতে পারেন। কোনো ধরনের আক্রমণাত্মক, অশালীন বা অসত্য রিভিউ কঠোরভাবে নিষিদ্ধ।
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
