'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingBag, Heart, Star, ArrowRight } from 'lucide-react';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice, toBengaliNumber } from '../utils/formatters';
import { trackViewContent } from '../utils/metaPixel';

interface QuickViewModalProps {
  book: Book;
  onClose: () => void;
  onOpenFullDetails: (book: Book) => void;
  onBuyNow?: (book: Book, quantity: number) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  book,
  onClose,
  onOpenFullDetails,
  onBuyNow,
}) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { getBookDisplayName } = useLanguage();

  const isWished = isInWishlist(book.id);
  const displayName = getBookDisplayName(book);

  useEffect(() => {
    if (book) {
      trackViewContent(book);
    }
  }, [book?.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center cursor-pointer transition-colors"
          aria-label="বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          {/* Cover */}
          <div className="sm:col-span-5 flex justify-center">
            <div className="w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border border-zinc-200 bg-zinc-50 relative">
              <img src={book.image || book.cover_image} alt={book.title} className="w-full h-full object-cover" />
              {book.discount > 0 && (
                <span className="absolute top-2 left-2 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                  {toBengaliNumber(book.discount)}% ছাড়
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="sm:col-span-7 flex flex-col text-left">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              {book.category}
            </span>
            <h3 className="text-xl font-bold text-zinc-900 mt-1 mb-0.5">{displayName}</h3>
            <p className="text-xs text-zinc-500 mb-2">
              লেখক: <span className="font-semibold text-zinc-700">{book.author}</span> • {book.publisher}
            </p>

            <div className="flex items-center gap-1 text-xs text-zinc-600 mb-3">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold">{toBengaliNumber(book.rating)}</span>
              <span className="text-zinc-400">({toBengaliNumber(book.reviewCount)} রিভিউ)</span>
            </div>

            <p className="text-xs text-zinc-600 line-clamp-3 mb-4 leading-relaxed">
              {book.description}
            </p>

            {/* Price & Stock */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{formatPrice(book.price)}</span>
                {book.originalPrice > book.price && (
                  <span className="text-xs text-zinc-400 line-through">
                    {formatPrice(book.originalPrice)}
                  </span>
                )}
              </div>

              {/* Stock Status Badge */}
              {book.stock <= 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  স্টক শেষ
                </span>
              ) : book.stock <= 5 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  সীমিত স্টক ({toBengaliNumber(book.stock)} টি বাকি)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ইন স্টক ({toBengaliNumber(book.stock)} টি)
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                disabled={book.stock <= 0}
                onClick={() => {
                  if (book.stock > 0) {
                    addToCart(book, 1);
                  }
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                  book.stock <= 0
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                    : 'bg-amber-500 hover:bg-amber-600 text-zinc-950 cursor-pointer shadow-xs active:scale-95'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{book.stock <= 0 ? 'স্টক শেষ' : 'কার্টে যোগ করুন'}</span>
              </button>

              {onBuyNow && (
                <button
                  type="button"
                  disabled={book.stock <= 0}
                  onClick={() => {
                    if (book.stock > 0) {
                      onBuyNow(book, 1);
                      onClose();
                    }
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                    book.stock <= 0
                      ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                      : 'bg-[#18181B] hover:bg-zinc-800 text-white cursor-pointer active:scale-95'
                  }`}
                >
                  <span>{book.stock <= 0 ? 'উপলব্ধ নেই' : 'এখনই কিনুন'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleWishlist(book)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-colors shrink-0 flex items-center justify-center ${
                  isWished ? 'bg-rose-50 border-rose-200 text-rose-500' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
                title="উইশলিস্ট"
              >
                <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullDetails(book);
              }}
              className="mt-3 text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>সম্পূর্ণ বিবরণ ও রিভিউ দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
