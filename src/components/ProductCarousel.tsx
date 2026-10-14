'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Book } from '../types';
import { ProductCard } from './ProductCard';

interface ProductCarouselProps {
  books: Book[];
  onOpenDetails: (book: Book) => void;
  onQuickView: (book: Book) => void;
  onBuyNow?: (book: Book) => void;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  books,
  onOpenDetails,
  onQuickView,
  onBuyNow,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollOffset = direction === 'left' ? -380 : 380;
      containerRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      {/* Navigation Arrow Left (Desktop) - Always visible */}
      <button
        type="button"
        onClick={() => handleScroll('left')}
        className="hidden md:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-zinc-200 text-zinc-700 items-center justify-center shadow-md hover:bg-zinc-50 hover:text-amber-600 transition-all cursor-pointer active:scale-90"
        aria-label="বামের বইগুলো দেখুন"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Navigation Arrow Right (Desktop) - Always visible */}
      <button
        type="button"
        onClick={() => handleScroll('right')}
        className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-zinc-200 text-zinc-700 items-center justify-center shadow-md hover:bg-zinc-50 hover:text-amber-600 transition-all cursor-pointer active:scale-90"
        aria-label="ডানের বইগুলো দেখুন"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Horizontal Scrolling Track */}
      <div
        ref={containerRef}
        tabIndex={0}
        className="flex gap-2.5 sm:gap-3.5 overflow-x-auto hide-scrollbar pb-3 pt-1 scroll-smooth snap-x snap-mandatory focus:outline-none"
      >
        {books.map((book, idx) => (
          <div
            key={book.id}
            className="shrink-0 snap-start w-[calc(50%-6px)] sm:w-[calc(33.33%-10px)] md:w-[calc(25%-11px)] lg:w-[calc(16.666%-12px)] min-w-[145px]"
          >
            <ProductCard
              book={book}
              onOpenDetails={onOpenDetails}
              onQuickView={onQuickView}
              onBuyNow={onBuyNow}
              isHighlighted={idx === 0 || idx === 5}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

