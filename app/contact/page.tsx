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
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle2, Facebook, Instagram } from 'lucide-react';

export default function ContactPage() {
  const router = useRouter();
  const { siteSettings } = useData();
  const { showToast } = useToast();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const storePhone = siteSettings?.phone || '০১৭০০-০০০০০০';
  const storeEmail = siteSettings?.email || 'support@shesherpata.com';
  const storeAddress = siteSettings?.address || 'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫';
  const supportHours = siteSettings?.support_hours || 'সকাল ৯টা - রাত ১০টা';
  const whatsappNumber = siteSettings?.whatsapp_number || storePhone;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) return;

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      setName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
      showToast('আপনার বার্তাটি সফলভাবে পাঠানো হয়েছে!', 'success');
      setTimeout(() => setSentSuccess(false), 5000);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
      <Header
        currentNav="contact"
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
              যোগাযোগ ও সহায়তা
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900">
              আমাদের সাথে যোগাযোগ করুন
            </h1>
            <div className="w-16 h-1 bg-[#F59E0B] rounded-full mx-auto" />
            <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed">
              বই সংক্রান্ত যেকোনো পরামর্শ, অর্ডার সহায়তা বা তথ্যের জন্য সরাসরি আমাদের সাথে যুক্ত হতে পারেন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information Cards */}
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-5">
                <h2 className="text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-3">
                  কাস্টমার কেয়ার ও হেল্পলাইন
                </h2>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">সরাসরি কল:</span>
                      <a href={`tel:${storePhone}`} className="text-amber-800 font-semibold hover:underline">
                        {storePhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">ইমেইল সহায়তা:</span>
                      <a href={`mailto:${storeEmail}`} className="text-amber-800 font-semibold hover:underline">
                        {storeEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">ঠিকানা:</span>
                      <span className="text-zinc-600 leading-relaxed">{storeAddress}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">সাপোর্ট সময়সূচি:</span>
                      <span className="text-zinc-600">{supportHours}</span>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                {(siteSettings?.facebook_url || siteSettings?.instagram_url) && (
                  <div className="pt-3 border-t border-zinc-100">
                    <span className="text-xs font-bold text-zinc-700 block mb-2">সামাজিক যোগাযোগ মাধ্যম:</span>
                    <div className="flex items-center gap-2">
                      {siteSettings?.facebook_url && (
                        <a
                          href={siteSettings.facebook_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-[#1877F2] hover:text-white text-zinc-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <Facebook className="w-3.5 h-3.5" />
                          <span>ফেসবুক পেইজ</span>
                        </a>
                      )}
                      {siteSettings?.instagram_url && (
                        <a
                          href={siteSettings.instagram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-[#E4405F] hover:text-white text-zinc-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          <span>ইনস্টাগ্রাম</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Message Form */}
            <div className="p-6 rounded-3xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <span>আমাদের বার্তা পাঠান</span>
              </h2>

              {sentSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="font-bold text-sm">ধন্যবাদ! আপনার বার্তাটি গৃহীত হয়েছে।</h3>
                  <p className="text-xs text-emerald-700">আমরা অতি দ্রুত আপনার সাথে যোগাযোগ করব।</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      আপনার নাম *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="যেমন: তানভীর হাসান"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        মোবাইল নম্বর *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="০১৭১১-XXXXXX"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        ইমেইল (ঐচ্ছিক)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      বিষয়
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="যেমন: বইয়ের অর্ডার সংক্রান্ত জিজ্ঞাসা"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      আপনার বার্তা *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="আপনার প্রশ্ন বা মতামত বিস্তারিত লিখুন..."
                      className="w-full p-3 rounded-xl border border-zinc-200 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'পাঠানো হচ্ছে...' : 'বার্তা পাঠান'}</span>
                  </button>
                </form>
              )}
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
