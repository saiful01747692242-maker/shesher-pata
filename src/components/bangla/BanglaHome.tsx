'use client';

import React, { useMemo } from 'react';
import { HeroBanner } from '../HeroBanner';
import { CategoryCarousel } from '../CategoryCarousel';
import { SectionHeader } from '../SectionHeader';
import { ProductCarousel } from '../ProductCarousel';
import { Book } from '../../types';
import { Gift } from 'lucide-react';
import { matchesCategory } from '../../utils/filterUtils';
import { useData } from '../../context/DataContext';

interface BanglaHomeProps {
  books: Book[];
  onSelectCategory: (categoryId: string) => void;
  catalogCategory: string;
  onViewAllSection: (categoryId: string) => void;
  onOpenDetails: (book: Book) => void;
  onQuickView: (book: Book) => void;
  onBuyNow: (book?: Book) => void;
  onExploreClick: () => void;
}

export const BanglaHome: React.FC<BanglaHomeProps> = ({
  books,
  onSelectCategory,
  catalogCategory,
  onViewAllSection,
  onOpenDetails,
  onQuickView,
  onBuyNow,
  onExploreClick,
}) => {
  const internationalBooks = useMemo(
    () => books.filter((b) => b.isInternational || b.sectionIds?.includes('international') || matchesCategory(b.category, b.tags, 'english')),
    [books]
  );

  const bestsellerBooks = useMemo(
    () => books.filter((b) => b.isBestseller || b.sectionIds?.includes('bestseller')),
    [books]
  );

  const newReleaseBooks = useMemo(
    () => books.filter((b) => b.isNew || b.isNewRelease || b.sectionIds?.includes('new_releases') || b.rating >= 4.8),
    [books]
  );

  const discountedBooks = useMemo(
    () => books.filter((b) => b.discount >= 20),
    [books]
  );

  const classicAndNovelBooks = useMemo(
    () => books.filter((b) => matchesCategory(b.category, b.tags, 'novel') || matchesCategory(b.category, b.tags, 'poetry')),
    [books]
  );

  const juvenileAndMysteryBooks = useMemo(
    () => books.filter((b) => matchesCategory(b.category, b.tags, 'children') || matchesCategory(b.category, b.tags, 'thriller') || b.tags?.includes('ফেলুদা')),
    [books]
  );

  const islamicBooks = useMemo(
    () => books.filter((b) => matchesCategory(b.category, b.tags, 'islamic')),
    [books]
  );

  const { banners } = useData();
  const promoBanner = useMemo(() => {
    return (banners || []).find(
      (b) => (b.placement === 'homepage_promo' || b.type === 'homepage_promo') && b.is_active !== false
    );
  }, [banners]);

  return (
    <div className="space-y-6 sm:space-y-10 font-['Noto_Sans_Bengali']">
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900">
          বাংলা ও ইংরেজি বই অনলাইনে কিনুন
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          শেষের পাতা — জনপ্রিয় লেখক, নতুন প্রকাশনা ও পছন্দের বই সারা দেশে ক্যাশ অন ডেলিভারিতে অর্ডার করুন।
        </p>
      </section>

      {/* Hero Section with interactive multi-slide carousel */}
      <HeroBanner
        onExploreClick={onExploreClick}
        onBuyNowClick={() => onBuyNow(bestsellerBooks[0])}
      />

      {/* Category Carousel */}
      <CategoryCarousel
        onSelectCategory={onSelectCategory}
        activeCategoryId={catalogCategory}
      />

      {/* Section 1: আজকের অফার (Discounted) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          title="আজকের বিশেষ অফার"
          subtitle="সর্বোচ্চ ২০% থেকে ৪০% ছাড়ে পছন্দের সেরা বই"
          onViewAll={() => onViewAllSection('all')}
        />
        <ProductCarousel
          books={discountedBooks}
          onOpenDetails={onOpenDetails}
          onQuickView={onQuickView}
          onBuyNow={onBuyNow}
        />
      </section>

      {/* Section 2: পাঠকের পছন্দ (Bestsellers) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          title="পাঠকের পছন্দ ও জনপ্রিয় বই"
          subtitle="বাংলাদেশের সর্বাধিক পঠিত ও আলোচিত বইসমূহ"
          onViewAll={() => onViewAllSection('all')}
        />
        <ProductCarousel
          books={bestsellerBooks}
          onOpenDetails={onOpenDetails}
          onQuickView={onQuickView}
          onBuyNow={onBuyNow}
        />
      </section>

      {/* Mid-Page Promotional Banner: বইমেলা বিশেষ কুপন */}
      {(promoBanner || (!banners || banners.length === 0)) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 my-4">
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#1B1910] via-[#282419] to-[#1B1910] border border-[#3A3423] p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5A913] text-zinc-950 text-xs font-black">
                <Gift className="w-3.5 h-3.5" />
                <span>{promoBanner?.badge || 'বিশেষ সুযোগ'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {promoBanner?.title || 'যেকোনো ৩টি বই কিনলেই সারা দেশে ফ্রি হোম ডেলিভারি!'}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300">
                {promoBanner?.subtitle ? (
                  <span>{promoBanner.subtitle}</span>
                ) : (
                  <>চেকআউটে কুপন কোড ব্যবহার করুন: <strong className="text-[#E5A913] font-bold">{promoBanner?.highlight_text || 'SHESHER10'}</strong></>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (promoBanner?.primary_button_url && promoBanner.primary_button_url !== 'books') {
                  if (promoBanner.primary_button_url.startsWith('/') || promoBanner.primary_button_url.startsWith('http')) {
                    window.location.href = promoBanner.primary_button_url;
                  } else {
                    window.location.href = `/?category=${encodeURIComponent(promoBanner.primary_button_url)}`;
                  }
                } else {
                  onExploreClick();
                }
              }}
              className="px-6 py-3 rounded-xl bg-[#E5A913] hover:bg-[#D99600] text-zinc-950 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
            >
              {promoBanner?.primary_button_text || 'অফার উপভোগ করুন ➔'}
            </button>
          </div>
        </div>
      )}

      {/* Section 3: নতুন প্রকাশনা (New Releases) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          title="নতুন প্রকাশনা"
          subtitle="সাম্প্রতিক প্রকাশিত নতুন ও আলোচিত বই"
          onViewAll={() => onViewAllSection('all')}
        />
        <ProductCarousel
          books={newReleaseBooks}
          onOpenDetails={onOpenDetails}
          onQuickView={onQuickView}
          onBuyNow={onBuyNow}
        />
      </section>

      {/* Section 4: থ্রিলার, গোয়েন্দা ও রহস্য */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          title="থ্রিলার, গোয়েন্দা ও রহস্য"
          subtitle="ফেলুদা, মিসির আলি ও টানটান উত্তেজনার রোমাঞ্চকর গল্প"
          onViewAll={() => onViewAllSection('কিশোর সাহিত্য')}
        />
        <ProductCarousel
          books={juvenileAndMysteryBooks}
          onOpenDetails={onOpenDetails}
          onQuickView={onQuickView}
          onBuyNow={onBuyNow}
        />
      </section>

      {/* Section 5: চিরায়ত বাংলা উপন্যাস ও কবিতা */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          title="চিরায়ত বাংলা উপন্যাস ও সাহিত্য"
          subtitle="রবীন্দ্রনাথ, নজরুল, শরৎচন্দ্র সহ কালজয়ী সাহিত্যসমগ্র"
          onViewAll={() => onViewAllSection('উপন্যাস')}
        />
        <ProductCarousel
          books={classicAndNovelBooks}
          onOpenDetails={onOpenDetails}
          onQuickView={onQuickView}
          onBuyNow={onBuyNow}
        />
      </section>

      {/* Section 6: ইসলামিক সাহিত্য */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          title="ইসলামিক সাহিত্য ও চিন্তাধারা"
          subtitle="আত্মশুদ্ধি, ইতিহাস ও জীবন গঠনের উপযোগী বইসমূহ"
          onViewAll={() => onViewAllSection('ইসলামিক সাহিত্য')}
        />
        <ProductCarousel
          books={islamicBooks}
          onOpenDetails={onOpenDetails}
          onQuickView={onQuickView}
        />
      </section>

      {/* Section 7: বিশ্বসাহিত্য ও অনুবাদ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          title="বিশ্বসাহিত্য ও অনুবাদ গ্রন্থ"
          subtitle="আন্তর্জাতিক পুরস্কারপ্রাপ্ত ও জনপ্রিয় বিদেশি অনুবাদ বই"
          onViewAll={() => onViewAllSection('বিদেশি বই')}
        />
        <ProductCarousel
          books={internationalBooks}
          onOpenDetails={onOpenDetails}
          onQuickView={onQuickView}
        />
      </section>

      {/* Trust Assurance Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-3xl border border-[#E8E3D5] shadow-xs text-center">
          <div className="space-y-1 p-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center mx-auto text-lg">
              📖
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-zinc-900">১০০% আসল বই</h4>
            <p className="text-[11px] text-zinc-500">সকল প্রকাশনীর আসল প্রিন্ট</p>
          </div>

          <div className="space-y-1 p-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center mx-auto text-lg">
              🚀
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-zinc-900">সারা দেশে ডেলিভারি</h4>
            <p className="text-[11px] text-zinc-500">দ্রুততম সময়ে সরাসরি আপনার দরজায়</p>
          </div>

          <div className="space-y-1 p-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center mx-auto text-lg">
              💵
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-zinc-900">ক্যাশ অন ডেলিভারি</h4>
            <p className="text-[11px] text-zinc-500">বই পেয়ে মূল্য পরিশোধের সুবিধা</p>
          </div>

          <div className="space-y-1 p-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center mx-auto text-lg">
              🔄
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-zinc-900">সহজ রিটার্ন</h4>
            <p className="text-[11px] text-zinc-500">৭ দিনের মধ্যে পরিবর্তনের নিশ্চয়তা</p>
          </div>
        </div>
      </div>
    </div>
  );
};
