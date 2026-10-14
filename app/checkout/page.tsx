'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { Header } from '../../src/components/Header';
import { Footer } from '../../src/components/Footer';
import { CheckoutModal } from '../../src/components/CheckoutModal';
import { CartDrawer } from '../../src/components/CartDrawer';
import { WishlistDrawer } from '../../src/components/WishlistDrawer';
import { TrackOrderModal } from '../../src/components/TrackOrderModal';
import { AccountModal } from '../../src/components/AccountModal';
import { useCart } from '../../src/context/CartContext';
import { useData } from '../../src/context/DataContext';
import { useToast } from '../../src/context/ToastContext';
import { CartItem } from '../../src/types';
import { getBookSlug } from '../../src/utils/bookUrl';
import { trackSearch } from '../../src/utils/metaPixel';

const BUY_NOW_STORAGE_KEY = 'shesher_pata_buy_now';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart } = useCart();
  const { books } = useData();
  const { showToast } = useToast();

  const [directItem, setDirectItem] = useState<CartItem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Restore directItem from sessionStorage or URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 1. First priority: Check direct buy item from sessionStorage
      const stored = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.book && parsed.book.id && parsed.quantity) {
          setDirectItem(parsed);
          setIsInitialized(true);
          return;
        }
      }

      // 2. Second priority: Check bookId or slug from URL search params
      const bookIdParam = searchParams.get('bookId') || searchParams.get('id');
      const qtyParam = parseInt(searchParams.get('qty') || searchParams.get('quantity') || '1', 10);

      if (bookIdParam && books && books.length > 0) {
        const found = books.find((b) => b.id === bookIdParam || getBookSlug(b) === bookIdParam);
        if (found) {
          if (found.stock <= 0) {
            showToast('দুঃখিত! বইটি বর্তমানে স্টকে নেই।', 'error');
          } else {
            const item: CartItem = {
              book: found,
              quantity: Math.max(1, Math.min(qtyParam || 1, found.stock || 1)),
            };
            setDirectItem(item);
            try {
              sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(item));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('[CheckoutPage] Error restoring direct checkout item:', err);
    } finally {
      setIsInitialized(true);
    }
  }, [searchParams, books, showToast]);

  const hasItems = Boolean(directItem || (cart && cart.length > 0));

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
      <Header
        currentNav="books"
        onNavigate={(navId) => {
          if (navId === 'home') {
            router.push('/');
          } else {
            router.push('/' + (navId === 'books' ? '' : navId));
          }
        }}
        onSearchSubmit={(query) => {
          if (query?.trim()) trackSearch(query.trim());
          router.push('/');
        }}
        onSelectBook={(selectedBook) => router.push(`/book/${getBookSlug(selectedBook)}`)}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      <main className="flex-1 py-8 px-4 sm:px-6 max-w-4xl mx-auto w-full flex flex-col justify-center items-center">
        {/* If no items in checkout (both direct item and cart are empty) */}
        {isInitialized && !hasItems ? (
          <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-zinc-200 shadow-xl my-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-inner">
              <ShoppingBag className="w-10 h-10 stroke-[1.75]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
                আপনার চেকআউট খালি
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                চেকআউট সম্পন্ন করার জন্য কোনো বই নির্বাচন করা হয়নি। শেষের পাতা অনলাইন বুকশপে আপনার পছন্দের বইগুলো খুঁজে নিয়ে অর্ডার করুন।
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>বইসমূহ ঘুরে দেখুন</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Checkout Interface */
          <div className="w-full">
            <CheckoutModal
              isOpen={true}
              directItem={directItem}
              onClose={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/');
                }
              }}
              onOrderSuccess={() => {
                showToast('আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!', 'success');
              }}
            />
          </div>
        )}
      </main>

      <Footer
        onNavigate={() => router.push('/')}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
      />

      <CartDrawer
        onProceedToCheckout={() => {
          setDirectItem(null);
          try {
            sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
          } catch {}
        }}
        onExploreBooks={() => router.push('/')}
      />

      <WishlistDrawer
        onExploreBooks={() => router.push('/')}
        onOpenDetails={(b) => router.push(`/book/${getBookSlug(b)}`)}
      />

      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onOpenOrders={() => setIsTrackOrderOpen(true)}
        onOpenWishlist={() => {}}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FEFDF9] text-zinc-900 font-['Noto_Sans_Bengali']">
          <div className="animate-pulse text-sm font-bold text-amber-800">
            চেকআউট লোড হচ্ছে...
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
