'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Youtube, Check, Heart } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useData } from '../context/DataContext';

interface FooterProps {
  onNavigate: (navId: string) => void;
  onOpenTrackOrder: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenTrackOrder }) => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { siteSettings } = useData();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 5000);
    }
  };

  return (
    <footer className="w-full mt-12 select-none font-['Noto_Sans_Bengali']">
      {/* Newsletter / Subscription Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div className="relative bg-[#FAF8F4] border border-[#E8E3D5] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs overflow-hidden">
          {/* Background Texture Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-35 bg-repeat bg-[length:320px_auto]"
            style={{
              backgroundImage: 'url("/images/background.png")',
              backgroundPosition: 'top left',
            }}
          />

          <div className="relative z-10 text-center md:text-left space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-[#1E1B13]">
              নতুন বই ও অফারের আপডেট পেতে যুক্ত থাকুন
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600">
              আমাদের নিউজলেটারে সাবস্ক্রাইব করুন এবং বিশেষ ডিসকাউন্ট কুপন পান সরাসরি আপনার ইমেইলে।
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="relative z-10 w-full md:w-auto flex-1 max-w-md flex items-center shadow-xs rounded-xl overflow-hidden border border-zinc-300 focus-within:border-[#E5A913] bg-white transition-all">
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="আপনার মোবাইল নম্বর বা ইমেইল লিখুন..."
              className="w-full bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-xs sm:text-sm outline-none font-medium"
            />
            <button
              type="submit"
              className="bg-[#E5A913] hover:bg-[#D99600] text-zinc-950 font-bold text-xs sm:text-sm px-6 py-3 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              {isSubscribed ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>ধন্যবাদ!</span>
                </>
              ) : (
                <span>সাবস্ক্রাইব</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Dark Main Footer Body with Background Texture */}
      <div className="relative bg-[#18150C] text-zinc-300 border-t border-[#2A2417] pt-12 pb-14 overflow-hidden">
        {/* Signature Brand Texture Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-repeat bg-[length:320px_auto] mix-blend-screen"
          style={{
            backgroundImage: 'url("/images/background.png")',
            backgroundPosition: 'top left',
            filter: 'invert(1) sepia(1) hue-rotate(15deg) brightness(1.2)',
          }}
        />

        {/* Ambient atmospheric glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E5A913]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#E5A913]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {/* Column 1: Brand Logo & Social */}
            <div className="space-y-4">
              <BrandLogo variant="dark" size="md" onClick={() => onNavigate('home')} />
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                "শেষের পাতা" — বাংলাদেশের সর্বাধিক নির্ভরযোগ্য অনলাইন বইয়ের দোকান। দেশি-বিদেশি অমর সাহিত্যকর্ম ও সাম্প্রতিক প্রকাশনা সরাসরি আপনার ঠিকানায়।
              </p>

              {/* Social Circles */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={siteSettings?.facebook_url || "https://facebook.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-[#1877F2] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="ফেসবুক"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={siteSettings?.instagram_url || "https://instagram.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-[#E4405F] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="ইনস্টাগ্রাম"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-[#1DA1F2] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="টুইটার"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-[#FF0000] text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="ইউটিউব"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>

              {/* Payment method - Cash on Delivery */}
              <div className="pt-2">
                <span className="text-[11px] text-zinc-400 block mb-1.5 font-medium">পেমেন্ট সুবিধা:</span>
                <div className="inline-flex items-center gap-2 bg-[#231F14] border border-[#3E341F] rounded-xl px-3 py-2 text-xs font-semibold text-amber-400 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ক্যাশ অন ডেলিভারি (বই পেয়ে টাকা)</span>
                </div>
              </div>
            </div>

            {/* Column 2: বইয়ের বিভাগ */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2A2417] pb-2">
                বইয়ের বিভাগসমূহ
              </h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                {['উপন্যাস', 'থ্রিলার ও রহস্য', 'ইসলামিক সাহিত্য', 'শিশু-কিশোর', 'কবিতা ও প্রবন্ধ', 'ইংরেজি ও অনুবাদ', 'আত্মউন্নয়ন ও ক্যারিয়ার'].map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => onNavigate('books')}
                      className="hover:text-[#E5A913] transition-colors cursor-pointer"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: কাস্টমার সাপোর্ট ও পলিসি */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2A2417] pb-2">
                সহায়তা ও তথ্য
              </h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li>
                  <button
                    type="button"
                    onClick={onOpenTrackOrder}
                    className="hover:text-[#E5A913] transition-colors cursor-pointer text-amber-400 font-semibold"
                  >
                    ➔ অর্ডার ট্র্যাক করুন
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('about')}
                    className="hover:text-[#E5A913] transition-colors cursor-pointer"
                  >
                    আমাদের সম্পর্কে
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('help')}
                    className="hover:text-[#E5A913] transition-colors cursor-pointer"
                  >
                    সহায়তা ও এফএকিউ
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('contact')}
                    className="hover:text-[#E5A913] transition-colors cursor-pointer"
                  >
                    যোগাযোগ ও হেল্পলাইন
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('offers')}
                    className="hover:text-[#E5A913] transition-colors cursor-pointer"
                  >
                    চলমান স্পেশাল অফার
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('terms')}
                    className="hover:text-[#E5A913] transition-colors cursor-pointer"
                  >
                    শর্তাবলী ও নীতিমালা
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('privacy')}
                    className="hover:text-[#E5A913] transition-colors cursor-pointer"
                  >
                    গোপনীয়তা ও নিরাপত্তা নীতি
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: যোগাযোগ */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#2A2417] pb-2">
                যোগাযোগের ঠিকানা
              </h4>
              <div className="space-y-2.5 text-xs text-zinc-400">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#E5A913] shrink-0 mt-0.5" />
                  <span>{siteSettings?.address || 'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#E5A913] shrink-0" />
                  <span>
                    হটলাইন: {siteSettings?.phone || '০১৭০০-০০০০০০'}
                    {siteSettings?.alt_phone ? ` / ${siteSettings.alt_phone}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E5A913] shrink-0" />
                  <span>ইমেইল: {siteSettings?.email || 'support@shesherpata.com'}</span>
                </div>
                <p className="text-[11px] text-zinc-500 pt-1">
                  সাপোর্ট টিম সক্রিয়: {siteSettings?.support_hours || 'প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Solid Bright Golden Yellow Bottom Strip */}
      <div className="w-full bg-[#E5A913] text-zinc-950 font-bold py-2.5 px-4 text-center text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
        <span>© ২০২৬ শেষের পাতা (Shesher Pata) — সর্বস্বত্ব সংরক্ষিত।</span>
        <span className="text-[11px] font-semibold text-zinc-900 mt-1 sm:mt-0 flex items-center justify-center gap-1">
          বইপ্রেমীদের ভালোবাসায় তৈরি <Heart className="w-3 h-3 fill-zinc-950 inline" />
        </span>
      </div>
    </footer>
  );
};

