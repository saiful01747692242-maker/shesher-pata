'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { matchesCategory, normalizeBengali, isAllCategory } from '../utils/filterUtils';
import { transliterateBengaliToSlug } from '../utils/bookUrl';
import { toBengaliNumber } from '../utils/formatters';

interface CategoryCarouselProps {
  onSelectCategory: (categoryId: string) => void;
  activeCategoryId?: string;
}

const QUICK_CATEGORIES = [
  { id: 'novel', name: 'উপন্যাস', count: '৪২০+', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=160&q=80' },
  { id: 'thriller', name: 'থ্রিলার ও রহস্য', count: '৩১০+', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=160&q=80' },
  { id: 'islamic', name: 'ইসলামিক সাহিত্য', count: '৩৮০+', image: 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=160&q=80' },
  { id: 'children', name: 'শিশু-কিশোর', count: '২৯০+', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=160&q=80' },
  { id: 'poetry', name: 'কবিতা', count: '১৯৫+', image: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=160&q=80' },
  { id: 'self-help', name: 'আত্মউন্নয়ন', count: '২১০+', image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=160&q=80' },
  { id: 'history', name: 'ইতিহাস ও ঐতিহ্য', count: '২৪০+', image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=160&q=80' },
  { id: 'scifi', name: 'সায়েন্স ফিকশন', count: '১৮০+', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=160&q=80' },
  { id: 'english', name: 'ইংরেজি ও অনুবাদ', count: '৩৫০+', image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=160&q=80' },
  { id: 'academic', name: 'একাডেমিক ও ক্যারিয়ার', count: '৫২০+', image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=160&q=80' },
  { id: 'package', name: 'স্পেশাল প্যাকেজ', count: '৮৫+', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=160&q=80' },
];

export const CategoryCarousel: React.FC<CategoryCarouselProps> = ({
  onSelectCategory,
  activeCategoryId,
}) => {
  const { categories, books } = useData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Derive visible category counts from the current book catalog instead of stale manual counters.
  const displayCategories = React.useMemo(() => {
    const sourceCategories = categories && categories.length > 0
      ? categories
      : QUICK_CATEGORIES.map((category) => ({
          id: category.id,
          name: category.name,
          imageUrl: category.image,
        }));

    return sourceCategories
      .map((liveCat) => {
        const quick = QUICK_CATEGORIES.find(
          (item) => item.id === liveCat.id || matchesCategory(liveCat.name, [], item.id, categories)
        );
        const categoryKey = normalizeBengali(liveCat.name);
        const bookCount = (books || []).filter(
          (book) => normalizeBengali(book.category || '') === categoryKey
        ).length;

        return {
          id: liveCat.id,
          name: liveCat.name,
          bookCount,
          count: `${toBengaliNumber(bookCount)}টি বই`,
          image: liveCat.imageUrl || (liveCat as any).image || quick?.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=160&q=80',
        };
      })
      .filter((category) => category.bookCount > 0);
  }, [categories, books]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full my-2 sm:my-4 font-['Noto_Sans_Bengali']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative group/cat">
        {/* Left scroll button for desktop */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden md:flex absolute -left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-zinc-700 shadow-md border border-zinc-200 items-center justify-center z-10 opacity-0 group-hover/cat:opacity-100 transition-opacity hover:bg-zinc-50 cursor-pointer"
          aria-label="বামে স্ক্রোল"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Categories scroll container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1 scroll-smooth"
        >
          {/* All Categories Button Card (Dark Brown with Golden Highlight) */}
          <div
            onClick={() => onSelectCategory('all')}
            className={`group shrink-0 w-24 sm:w-28 bg-[#211E15] rounded-xl p-2 sm:p-2.5 border shadow-xs transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center select-none min-h-[88px] sm:min-h-[96px] ${
              isAllCategory(activeCategoryId)
                ? 'border-[#E5A913] ring-1 ring-[#E5A913]'
                : 'border-[#3A3423] hover:border-[#E5A913]'
            }`}
          >
            <div className="mb-1 text-[#E5A913] group-hover:scale-110 transition-transform">
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[#E5A913] group-hover:text-white transition-colors">
              সকল বই
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">সমগ্র সংগ্রহ</span>
          </div>

          {displayCategories.map((cat) => {
            const isSelected =
              !isAllCategory(activeCategoryId) &&
              (matchesCategory(cat.name, [], activeCategoryId, categories) || cat.id === activeCategoryId);

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.name)}
                className={`group shrink-0 w-24 sm:w-28 bg-white rounded-xl p-2 sm:p-2.5 border transition-all duration-200 cursor-pointer flex flex-col items-center text-center select-none shadow-2xs hover:shadow-sm ${
                  isSelected
                    ? 'border-[#E5A913] bg-amber-50/40 ring-1 ring-[#E5A913]'
                    : 'border-zinc-200/90 hover:border-amber-400'
                }`}
              >
                {/* Category Image Box */}
                <div className="relative w-14 h-12 sm:w-16 sm:h-14 rounded-lg overflow-hidden mb-1.5 bg-zinc-100 border border-zinc-100 flex items-center justify-center">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Category Name */}
                <h3 className="text-[11px] sm:text-xs font-bold text-zinc-800 group-hover:text-amber-700 transition-colors line-clamp-1 leading-tight">
                  {cat.name}
                </h3>
                <span className="text-[9px] text-zinc-400 font-normal mt-0.5">{cat.count}</span>
                <Link
                  href={`/category/${encodeURIComponent(transliterateBengaliToSlug(cat.name))}`}
                  onClick={(event) => event.stopPropagation()}
                  className="mt-0.5 text-[9px] font-bold text-amber-700 hover:underline"
                >
                  বই দেখুন
                </Link>
              </div>
            );
          })}
        </div>

        {/* Right scroll button for desktop */}
        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden md:flex absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-zinc-700 shadow-md border border-zinc-200 items-center justify-center z-10 opacity-0 group-hover/cat:opacity-100 transition-opacity hover:bg-zinc-50 cursor-pointer"
          aria-label="ডানে স্ক্রোল"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

