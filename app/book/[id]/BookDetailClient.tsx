'use client';

import React, { useState } from 'react';
import { Book, CartItem } from '../../../src/types';
import { Header } from '../../../src/components/Header';
import { Footer } from '../../../src/components/Footer';
import { ProductDetailsModal } from '../../../src/components/ProductDetailsModal';
import { CartDrawer } from '../../../src/components/CartDrawer';
import { WishlistDrawer } from '../../../src/components/WishlistDrawer';
import { CheckoutModal } from '../../../src/components/CheckoutModal';
import { TrackOrderModal } from '../../../src/components/TrackOrderModal';
import { AccountModal } from '../../../src/components/AccountModal';
import { useCart } from '../../../src/context/CartContext';
import { useToast } from '../../../src/context/ToastContext';
import { useRouter } from 'next/navigation';
import { trackSearch } from '../../../src/utils/metaPixel';
import { useData } from '../../../src/context/DataContext';
import { getBookSlug } from '../../../src/utils/bookUrl';

interface BookDetailClientProps {
  book: Book;
  allBooks: Book[];
}

export default function BookDetailClient({ book, allBooks }: BookDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { books } = useData();

  // Only use a cached/live record when it is demonstrably the same book as the
  // server-fetched record. A stale browser cache can contain a reused ID with
  // different title/slug data; allowing it to override the server record makes
  // the visible H1 disagree with the canonical title and Book/Product JSON-LD.
  const matchingLiveBook = books.find(
    (b) =>
      b.id === book.id &&
      b.title === book.title &&
      getBookSlug(b) === getBookSlug(book)
  );
  const liveBook = matchingLiveBook || book;
  const liveAllBooks = books && books.length > 0 ? books : allBooks;

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

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

      <main className="flex-1 py-4 sm:py-8">
        <ProductDetailsModal
          book={liveBook}
          allBooks={liveAllBooks}
          isPage={true}
          onClose={() => router.push('/')}
          onSelectBook={(b) => router.push(`/book/${getBookSlug(b)}`)}
          onBuyNow={(b, qty) => {
            if (!b || !b.id || b.stock <= 0) {
              showToast('দুঃখিত! বইটি বর্তমানে স্টকে নেই।', 'error');
              return;
            }
            const item: CartItem = {
              book: {
                ...b,
                id: b.id,
                price: Number(b.price) || 0,
                originalPrice: Number(b.originalPrice) || Number(b.price) || 0,
                title: b.title,
                author: b.author || '',
                cover_image: b.cover_image || b.image || '',
                image: b.image || b.cover_image || '',
                stock: b.stock,
              },
              quantity: Math.max(1, Math.min(qty || 1, b.stock || 1)),
            };
            try {
              sessionStorage.setItem('shesher_pata_buy_now', JSON.stringify(item));
            } catch (err) {
              console.error('[BookDetailClient] Failed to persist Buy Now session:', err);
            }
            router.push('/checkout');
          }}
          onOpenAccount={() => setIsAccountOpen(true)}
        />
      </main>

      <Footer
        onNavigate={() => router.push('/')}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
      />

      <CartDrawer
        onProceedToCheckout={() => {
          setBuyNowItem(null);
          try {
            sessionStorage.removeItem('shesher_pata_buy_now');
          } catch {}
          router.push('/checkout');
        }}
        onExploreBooks={() => router.push('/')}
      />

      <WishlistDrawer
        onExploreBooks={() => router.push('/')}
        onOpenDetails={(b) => router.push(`/book/${getBookSlug(b)}`)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        directItem={buyNowItem}
        onClose={() => {
          setIsCheckoutOpen(false);
          setBuyNowItem(null);
          try {
            sessionStorage.removeItem('shesher_pata_buy_now');
          } catch {}
        }}
        onOrderSuccess={() => {
          setIsCheckoutOpen(false);
          setBuyNowItem(null);
          try {
            sessionStorage.removeItem('shesher_pata_buy_now');
          } catch {}
          showToast('আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!', 'success');
        }}
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
