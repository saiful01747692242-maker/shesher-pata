'use client';

import React from 'react';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice, toBengaliNumber } from '../utils/formatters';

interface ProductCardProps {
  book: Book;
  onOpenDetails: (book: Book) => void;
  onQuickView: (book: Book) => void;
  onBuyNow?: (book: Book) => void;
  isHighlighted?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  book,
  onOpenDetails,
  onQuickView,
  onBuyNow,
}) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWished = isInWishlist(book.id);

  return (
    <div className="group relative bg-[#FDFBF7] rounded-2xl border border-[#EBDCB9] hover:border-[#E5A913] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden select-none font-['Noto_Sans_Bengali'] h-full">
      {/* Scalloped Red 40% OFF Starburst Seal Badge OR Out of Stock Badge */}
      {book.stock <= 0 ? (
        <div className="absolute top-2 left-2 z-10 bg-rose-600/95 text-white font-extrabold text-[10px] sm:text-[11px] px-2 py-0.5 rounded shadow-sm">
          স্টক শেষ
        </div>
      ) : book.discount > 0 ? (
        <div className="absolute top-2 left-2 z-10 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center filter drop-shadow-xs">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full text-[#9C1B1B] fill-current"
          >
            <path d="M50 2 L56 12 L67 8 L70 19 L82 18 L82 30 L93 33 L89 44 L98 50 L89 56 L93 67 L82 70 L82 82 L70 81 L67 92 L56 88 L50 98 L44 88 L33 92 L30 81 L18 82 L18 70 L7 67 L11 56 L2 50 L11 44 L7 33 L18 30 L18 18 L30 19 L33 8 L44 12 Z" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center leading-none pointer-events-none">
            <span className="text-[10px] sm:text-[11px] font-black tracking-tight">{toBengaliNumber(book.discount)}%</span>
            <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">OFF</span>
          </div>
        </div>
      ) : null}

      {/* Top Right Wishlist Heart Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleWishlist(book);
        }}
        className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center transition-all cursor-pointer opacity-80 group-hover:opacity-100 ${
          isWished ? 'text-rose-500 opacity-100' : 'text-zinc-400 hover:text-rose-500'
        }`}
        title={isWished ? 'পছন্দের তালিকা থেকে মুছুন' : 'পছন্দের তালিকায় রাখুন'}
        aria-label="উইশলিস্ট"
      >
        <Heart className={`w-3.5 h-3.5 ${isWished ? 'fill-rose-500' : ''}`} />
      </button>

      {/* Top Book Image Container (Off-white / cream background + Golden Bottom Divider) */}
      <div
        onClick={() => onOpenDetails(book)}
        className="relative aspect-[3/4] w-full bg-[#FAF7F0] p-4 flex items-center justify-center cursor-pointer border-b-[3.5px] border-[#DEB038]"
      >
        <img
          src={book.image || book.cover_image}
          alt={book.title}
          className={`h-full w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-md ${
            book.stock <= 0 ? 'opacity-70 grayscale-[25%]' : ''
          }`}
          loading="lazy"
        />

        {/* Quick View and Buy Now Buttons on Desktop Hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-1.5 pointer-events-none p-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(book);
            }}
            className="pointer-events-auto bg-white hover:bg-[#E5A913] text-zinc-900 font-bold px-2.5 py-1.5 rounded-full text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer transform -translate-y-2 group-hover:translate-y-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>একনজরে</span>
          </button>
          {onBuyNow && book.stock > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBuyNow(book);
              }}
              className="pointer-events-auto bg-[#18181B] hover:bg-zinc-800 text-white font-bold px-2.5 py-1.5 rounded-full text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer transform -translate-y-2 group-hover:translate-y-0"
            >
              <span>এখনই কিনুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Book Information Section */}
      <div className="p-3.5 pt-3 flex flex-col flex-1 justify-between bg-white">
        <div>
          {/* Book Title */}
          <h3
            onClick={() => onOpenDetails(book)}
            className="font-bold text-sm sm:text-[15px] text-[#221F17] hover:text-[#B45309] transition-colors line-clamp-1 cursor-pointer leading-snug"
            title={book.title}
          >
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-[#8C8474] truncate mt-1 font-normal">
            {book.author}
          </p>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="h-[1px] bg-[#EBDCB9]/70 w-full my-2.5" />

        {/* Pricing & 'যোগ করুন' Button */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Prices */}
          <div className="flex flex-col leading-tight">
            {book.originalPrice > book.price && (
              <span className="text-[11px] text-[#A0988A] line-through font-medium mb-0.5">
                {formatPrice(book.originalPrice)}
              </span>
            )}
            <span className="text-base sm:text-lg font-black text-[#1E1B13]">
              {formatPrice(book.price)}
            </span>
          </div>

          {/* 'যোগ করুন' button with Cart Icon and Golden Border */}
          <button
            type="button"
            disabled={book.stock <= 0}
            onClick={(e) => {
              e.stopPropagation();
              if (book.stock > 0) {
                addToCart(book, 1);
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs sm:text-[13px] font-bold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 ${
              book.stock <= 0
                ? 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : 'border-[#E5C365] bg-[#FFFDF5] hover:bg-[#E5A913] text-[#2D281E] hover:text-zinc-950 cursor-pointer active:scale-95'
            }`}
            title={book.stock <= 0 ? 'স্টক শেষ' : 'কার্টে যোগ করুন'}
          >
            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{book.stock <= 0 ? 'স্টক শেষ' : 'যোগ করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

