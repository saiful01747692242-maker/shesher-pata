'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../src/context/ToastContext';
import { useCart } from '../src/context/CartContext';
import { useWishlist } from '../src/context/WishlistContext';
import { useData } from '../src/context/DataContext';
import { Book, CartItem } from '../src/types';
import { trackSearch } from '../src/utils/metaPixel';

// Bangla UI Components
import { Header } from '../src/components/Header';
import { BanglaHome } from '../src/components/bangla/BanglaHome';
import { CatalogView } from '../src/components/CatalogView';
import { AuthorsView } from '../src/components/AuthorsView';
import { Footer } from '../src/components/Footer';
import { MobileBottomNav } from '../src/components/MobileBottomNav';

// Shared Drawers and Modals
import { ProductDetailsModal } from '../src/components/ProductDetailsModal';
import { QuickViewModal } from '../src/components/QuickViewModal';
import { CartDrawer } from '../src/components/CartDrawer';
import { WishlistDrawer } from '../src/components/WishlistDrawer';
import { CheckoutModal } from '../src/components/CheckoutModal';
import { TrackOrderModal } from '../src/components/TrackOrderModal';
import { AccountModal } from '../src/components/AccountModal';
import { NAV_ITEMS } from '../src/components/Navigation';
import { getCategoryDisplayName, normalizeBengali, CANONICAL_CATEGORIES, isAllCategory } from '../src/utils/filterUtils';
import { getBookSlug } from '../src/utils/bookUrl';

export default function HomePage({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { setIsWishlistOpen } = useWishlist();
  const { books, siteSettings, categories } = useData();

  // Navigation state
  const [currentNav, setCurrentNav] = useState<string>('home');
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedAuthorForView, setSelectedAuthorForView] = useState<string>('');

  // Modals & Drawers
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [selectedBookForQuickView, setSelectedBookForQuickView] = useState<Book | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState<boolean>(false);
  const [isAccountOpen, setIsAccountOpen] = useState<boolean>(false);

  // Navigate directly to individual book URL
  const handleOpenBookDetails = (book: Book) => {
    router.push(`/book/${encodeURIComponent(getBookSlug(book))}`);
  };

  // Sync category or search from URL on load
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCat = params.get('category');
      const urlSearch = params.get('search');
      const urlAuthor = params.get('author');

      if (urlCat) {
        if (isAllCategory(urlCat)) {
          setCatalogCategory('all');
        } else {
          const resolved = getCategoryDisplayName(urlCat, categories);
          setCatalogCategory(resolved || urlCat);
        }
        setCurrentNav('books');
      }
      if (urlSearch) {
        setCatalogSearch(urlSearch);
        setCurrentNav('books');
      }
      if (urlAuthor) {
        setSelectedAuthorForView(normalizeBengali(urlAuthor));
        setCurrentNav('authors');
      }
    } catch {
      // ignore URL read errors
    }
  }, [categories]);

  // Handlers
  const handleSelectCategory = (categoryId: string) => {
    if (isAllCategory(categoryId)) {
      setCatalogCategory('all');
    } else {
      const resolvedName = getCategoryDisplayName(categoryId, categories);
      setCatalogCategory(resolvedName || categoryId);
    }
    setCatalogSearch('');
    setCurrentNav('books');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAuthor = (authorName: string) => {
    setSelectedAuthorForView(normalizeBengali(authorName));
    setCurrentNav('authors');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      trackSearch(query.trim());
    }
    setCatalogSearch(query);
    setCatalogCategory('all');
    setCurrentNav('books');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAllSection = (categoryId: string) => {
    if (isAllCategory(categoryId)) {
      setCatalogCategory('all');
    } else {
      const resolvedName = getCategoryDisplayName(categoryId, categories);
      setCatalogCategory(resolvedName || categoryId);
    }
    setCatalogSearch('');
    setCurrentNav('books');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuyNow = (book?: Book, quantity = 1) => {
    if (!book || !book.id || book.stock <= 0) {
      showToast('দুঃখিত! বইটি বর্তমানে স্টকে নেই।', 'error');
      return;
    }
    const item: CartItem = {
      book: {
        ...book,
        id: book.id,
        price: Number(book.price) || 0,
        originalPrice: Number(book.originalPrice) || Number(book.price) || 0,
        title: book.title,
        author: book.author || '',
        cover_image: book.cover_image || book.image || '',
        image: book.image || book.cover_image || '',
        stock: book.stock,
      },
      quantity: Math.max(1, Math.min(quantity || 1, book.stock || 1)),
    };
    try {
      sessionStorage.setItem('shesher_pata_buy_now', JSON.stringify(item));
    } catch (err) {
      console.error('[HomePage] Failed to persist Buy Now session:', err);
    }
    router.push('/checkout');
  };

  // Universal Navigation router handling
  const handleNavClick = (navId: string) => {
    if (navId === 'books' || isAllCategory(navId)) {
      setCatalogCategory('all');
      setCatalogSearch('');
      setCurrentNav('books');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const navItem = NAV_ITEMS.find((item) => item.id === navId);
    if (navItem?.categoryFilter) {
      if (isAllCategory(navItem.categoryFilter)) {
        setCatalogCategory('all');
      } else {
        setCatalogCategory(navItem.categoryFilter);
      }
      setCatalogSearch('');
      setCurrentNav('books');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Dedicated route pages
    if (['about', 'help', 'contact', 'terms', 'privacy'].includes(navId)) {
      router.push('/' + navId);
      return;
    }

    if (navId === 'home') {
      setCatalogCategory('all');
      setCatalogSearch('');
      setCurrentNav('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check if navId represents any category by ID or alias
    const resolvedCat = getCategoryDisplayName(navId, categories);
    const isCategory =
      (resolvedCat && resolvedCat.toLowerCase() !== navId.toLowerCase()) ||
      categories.some((c) => c.id.toLowerCase() === navId.toLowerCase() || c.name === navId) ||
      CANONICAL_CATEGORIES.some((c) => c.id.toLowerCase() === navId.toLowerCase() || c.aliases.some((a) => a.toLowerCase() === navId.toLowerCase()));

    if (isCategory) {
      setCatalogCategory(isAllCategory(resolvedCat) ? 'all' : (resolvedCat || navId));
      setCatalogSearch('');
      setCurrentNav('books');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (navId === 'authors') {
      setSelectedAuthorForView('');
    }
    setCurrentNav(navId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF9] text-zinc-900 selection:bg-amber-400 selection:text-zinc-950 font-['Noto_Sans_Bengali']">
      {/* Header */}
      <Header
        currentNav={currentNav}
        onNavigate={handleNavClick}
        onSearchSubmit={handleSearchSubmit}
        onSelectBook={handleOpenBookDetails}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 lg:pb-0">
        {/* Home View */}
        {currentNav === 'home' && (
          <BanglaHome
            books={books}
            catalogCategory={catalogCategory}
            onSelectCategory={handleSelectCategory}
            onViewAllSection={handleViewAllSection}
            onOpenDetails={handleOpenBookDetails}
            onQuickView={(book) => setSelectedBookForQuickView(book)}
            onBuyNow={handleBuyNow}
            onExploreClick={() => {
              setCurrentNav('books');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* Books & Catalog View */}
        {(currentNav === 'books' || currentNav === 'publishers' || currentNav === 'packages' || currentNav === 'stationery') && (
          <CatalogView
            books={books}
            initialCategory={catalogCategory}
            initialSearch={catalogSearch}
            onOpenDetails={handleOpenBookDetails}
            onQuickView={(book) => setSelectedBookForQuickView(book)}
            onBuyNow={handleBuyNow}
            onResetToHome={() => {
              setCurrentNav('home');
              setCatalogCategory('all');
              setCatalogSearch('');
            }}
          />
        )}

        {/* Authors View */}
        {currentNav === 'authors' && (
          <AuthorsView
            books={books}
            initialAuthor={selectedAuthorForView}
            onOpenDetails={handleOpenBookDetails}
            onQuickView={(book) => setSelectedBookForQuickView(book)}
            onBuyNow={handleBuyNow}
            onResetToHome={() => setCurrentNav('home')}
          />
        )}

        {/* About / Contact / Offers static views */}
        {(currentNav === 'about' || currentNav === 'contact' || currentNav === 'offers') && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            <div className="p-8 rounded-3xl border border-zinc-200 bg-white text-zinc-900 shadow-xs space-y-4">
              <h1 className="text-2xl sm:text-3xl font-black">
                {currentNav === 'about'
                  ? 'আমাদের সম্পর্কে — শেষের পাতা'
                  : currentNav === 'contact'
                  ? 'যোগাযোগ ও সহায়তা — শেষের পাতা'
                  : 'চলমান অফার — শেষের পাতা'}
              </h1>
              <div className="w-12 h-1 bg-[#F59E0B] rounded-full" />

              {currentNav === 'offers' ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 space-y-2">
                    <h3 className="font-bold text-lg text-amber-900">
                      🎉 বইমেলা বিশেষ কুপন: SHESHER10
                    </h3>
                    <p className="text-sm">
                      যেকোনো ৩টি বইয়ের সাথে পান ফ্রি হোম ডেলিভারি এবং ফ্ল্যাট ১০% ডিসকাউন্ট!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm sm:text-base leading-relaxed text-zinc-700">
                    {siteSettings?.about_text || '"শেষের পাতা" কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা। আমরা বিশ্বাস করি একটি ভালো বই একজন মানুষের জীবন বদলে দিতে পারে।'}
                  </p>
                  <div className="p-4 border border-amber-200 rounded-2xl text-xs space-y-1 bg-[#FAF8F4] text-zinc-700">
                    <p><strong>ঠিকানা:</strong> {siteSettings?.address || 'কাঁটাবন বইয়ের মার্কেট, নিউ এলিফ্যান্ট রোড, ঢাকা-১২০৫'}</p>
                    <p><strong>হেল্পলাইন:</strong> {siteSettings?.phone || '০১৭০০-০০০০০০'} ({siteSettings?.support_hours || 'সকাল ৯টা - রাত ১০টা'})</p>
                    <p><strong>ইমেইল:</strong> {siteSettings?.email || 'support@shesherpata.com'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {children}

      {/* Footer */}
      <Footer
        onNavigate={(navId) => {
          setCurrentNav(navId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
      />
      <MobileBottomNav
        currentNav={currentNav}
        onNavigate={(navId) => {
          if (navId === 'categories') {
            setCurrentNav('books');
            setCatalogCategory('all');
          } else {
            setCurrentNav(navId);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* Drawers and Modals */}
      <CartDrawer
        onProceedToCheckout={() => {
          setBuyNowItem(null);
          try {
            sessionStorage.removeItem('shesher_pata_buy_now');
          } catch {}
          router.push('/checkout');
        }}
        onExploreBooks={() => {
          setCurrentNav('books');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <WishlistDrawer
        onExploreBooks={() => {
          setCurrentNav('books');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenDetails={handleOpenBookDetails}
      />

      {selectedBookForDetails && (
        <ProductDetailsModal
          book={selectedBookForDetails}
          allBooks={books}
          onClose={() => setSelectedBookForDetails(null)}
          onSelectBook={handleOpenBookDetails}
          onBuyNow={(b, qty) => handleBuyNow(b, qty)}
          onOpenAccount={() => setIsAccountOpen(true)}
        />
      )}

      {selectedBookForQuickView && (
        <QuickViewModal
          book={selectedBookForQuickView}
          onClose={() => setSelectedBookForQuickView(null)}
          onOpenFullDetails={(b) => {
            setSelectedBookForQuickView(null);
            handleOpenBookDetails(b);
          }}
          onBuyNow={(b, qty) => {
            setSelectedBookForQuickView(null);
            handleBuyNow(b, qty);
          }}
        />
      )}

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
          showToast('ধন্যবাদ! আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।', 'success');
        }}
      />

      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onOpenOrders={() => {
          setIsAccountOpen(false);
          setIsTrackOrderOpen(true);
        }}
        onOpenWishlist={() => {
          setIsAccountOpen(false);
          setIsWishlistOpen(true);
        }}
      />
    </div>
  );
}
