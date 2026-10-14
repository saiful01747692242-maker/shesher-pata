'use client';

import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, User, Menu, X, Tag, HelpCircle, PackageCheck, Phone, BookOpen } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { SearchBar } from './SearchBar';
import { TopBar } from './TopBar';
import { Navigation, NAV_ITEMS } from './Navigation';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useData } from '../context/DataContext';
import { Book } from '../types';
import { toBengaliNumber, formatPrice } from '../utils/formatters';

interface HeaderProps {
  currentNav: string;
  onNavigate: (navId: string) => void;
  onSelectBook: (book: Book) => void;
  onSearchSubmit: (query: string) => void;
  onOpenAccount: () => void;
  onOpenTrackOrder?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentNav,
  onNavigate,
  onSelectBook,
  onSearchSubmit,
  onOpenAccount,
  onOpenTrackOrder,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { totalItemsCount, subtotal, setIsCartOpen } = useCart();
  const { wishlist, setIsWishlistOpen } = useWishlist();
  const { siteSettings } = useData();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Top promotional & helpline bar */}
      <TopBar onNavigate={onNavigate} onOpenTrackOrder={onOpenTrackOrder} />

      {/* Main Sticky Header with smooth scroll behavior */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ease-out border-b border-[#2A2619] bg-[#211E15] ${
          isScrolled ? 'py-2 sm:py-2.5 shadow-md' : 'py-2.5 sm:py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Desktop & Tablet Top Row */}
          <div className="hidden lg:flex items-center justify-between gap-6">
            {/* Left: Brand Logo */}
            <div className="shrink-0">
              <BrandLogo variant="dark" onClick={() => onNavigate('home')} size={isScrolled ? 'md' : 'lg'} />
            </div>

            {/* Center: Large Search Bar */}
            <div className="flex-1 max-w-xl mx-4">
              <SearchBar onSelectBook={onSelectBook} onSearchSubmit={onSearchSubmit} />
            </div>

            {/* Right: Actions (Account, Wishlist, Cart) - Sleek icons as in screenshot */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Account Icon */}
              <button
                type="button"
                onClick={onOpenAccount}
                className="p-2 rounded-full text-zinc-200 hover:text-[#E5A913] hover:bg-[#2A2417] transition-colors cursor-pointer"
                title="অ্যাকাউন্ট"
              >
                <User className="w-5 h-5 text-[#E5A913]" />
              </button>

              {/* Wishlist Icon */}
              <button
                type="button"
                onClick={() => setIsWishlistOpen(true)}
                className="relative p-2 rounded-full text-zinc-200 hover:text-[#E5A913] hover:bg-[#2A2417] transition-colors cursor-pointer"
                title="উইশলিস্ট"
              >
                <Heart className="w-5 h-5 text-[#E5A913]" />
                {wishlist.length > 0 && (
                  <span className="absolute top-0 right-0 bg-[#D32F2F] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {toBengaliNumber(wishlist.length)}
                  </span>
                )}
              </button>

              {/* Cart Icon */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-full text-zinc-200 hover:text-[#E5A913] hover:bg-[#2A2417] transition-colors cursor-pointer"
                title="শপিং কার্ট"
              >
                <ShoppingBag className="w-5 h-5 text-[#E5A913]" />
                {totalItemsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-[#E5A913] text-zinc-950 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {toBengaliNumber(totalItemsCount)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Header */}
          <div className="lg:hidden flex flex-col gap-2.5">
            {/* Top Row: Hamburger + Brand Logo + Wishlist + Cart */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 -ml-1.5 text-zinc-200 hover:text-white rounded-lg hover:bg-[#2A2619] transition-colors"
                  aria-label="মেনু খুলুন"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <BrandLogo variant="dark" onClick={() => onNavigate('home')} size="sm" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsWishlistOpen(true)}
                  className="relative p-2 text-zinc-200 hover:text-white rounded-lg transition-colors"
                  aria-label="উইশলিস্ট"
                >
                  <Heart className="w-5 h-5 text-[#E5A913]" />
                  {wishlist.length > 0 && (
                    <span className="absolute top-1 right-1 bg-[#D32F2F] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {toBengaliNumber(wishlist.length)}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-zinc-200 hover:text-white rounded-lg transition-colors flex items-center"
                  aria-label="কার্ট"
                >
                  <ShoppingBag className="w-5 h-5 text-[#E5A913]" />
                  {totalItemsCount > 0 && (
                    <span className="absolute top-1 right-1 bg-[#E5A913] text-zinc-950 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                      {toBengaliNumber(totalItemsCount)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Second Row: Full-width Search Bar */}
            <div className="w-full">
              <SearchBar
                onSelectBook={onSelectBook}
                onSearchSubmit={onSearchSubmit}
                isMobile={true}
              />
            </div>
          </div>
        </div>

        {/* Desktop Category Navigation */}
        <div className="hidden lg:block mt-2">
          <Navigation currentNav={currentNav} onNavigate={onNavigate} />
        </div>
      </header>

      {/* Mobile Sidebar Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto font-['Noto_Sans_Bengali',sans-serif]">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-[#FAF8F4]">
              <BrandLogo
                variant="light"
                onClick={() => {
                  onNavigate('home');
                  setIsMobileMenuOpen(false);
                }}
                size="sm"
              />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="p-3 flex-1 divide-y divide-zinc-100">
              <div className="py-2">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1 block">
                  মেনু
                </span>
                <ul className="space-y-0.5">
                  {NAV_ITEMS.map((item) => {
                    const isActive = currentNav === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-amber-100/70 text-amber-900 font-semibold'
                              : 'text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Extra Account & Info Links */}
              <div className="py-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1 block">
                  গ্রাহক সুবিধা
                </span>
                <ul className="space-y-0.5 text-sm">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAccount();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg"
                    >
                      <User className="w-4 h-4 text-zinc-500" />
                      <span>আমার প্রোফাইল ও অর্ডার</span>
                    </button>
                  </li>
                  {onOpenTrackOrder && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenTrackOrder();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg"
                      >
                        <PackageCheck className="w-4 h-4 text-amber-600" />
                        <span>অর্ডার ট্র্যাকিং</span>
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('offers');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg"
                    >
                      <Tag className="w-4 h-4 text-amber-500" />
                      <span>চলমান স্পেশাল অফার</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('about');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg"
                    >
                      <BookOpen className="w-4 h-4 text-zinc-500" />
                      <span>আমাদের সম্পর্কে</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('help');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg"
                    >
                      <HelpCircle className="w-4 h-4 text-zinc-500" />
                      <span>সহায়তা ও এফএকিউ</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('contact');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg"
                    >
                      <Phone className="w-4 h-4 text-amber-600" />
                      <span>যোগাযোগ ও হেল্পলাইন</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom info */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-800">শেষের পাতা কাস্টমার কেয়ার</p>
              <p>কল করুন: {siteSettings?.phone || '০১৭০০-০০০০০০'}</p>
              <p className="text-[11px] text-zinc-400 pt-1">{siteSettings?.support_hours || 'সকাল ৯টা - রাত ১০টা'}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
