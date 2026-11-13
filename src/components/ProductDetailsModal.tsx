'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, ShoppingBag, Star, Share2, Check, ArrowRight, ArrowLeft, Copy, ShieldCheck, Truck, RefreshCw, BookOpen, Send, AlertCircle, CheckCircle2, Loader2, User } from 'lucide-react';
import { Book, BookReview } from '../types';
import { getBookSlug, getBookUrl, getWhatsAppShareUrl } from '../utils/bookUrl';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { reviewService } from '../services/reviewService';
import { formatPrice, toBengaliNumber } from '../utils/formatters';
import { trackViewContent } from '../utils/metaPixel';
import { trackGA4ViewItem } from '../utils/ga4Ecommerce';
import { matchesCategory, matchesAuthor } from '../utils/filterUtils';

interface ProductDetailsModalProps {
  book: Book;
  allBooks: Book[];
  onClose: () => void;
  onSelectBook: (book: Book) => void;
  onBuyNow: (book: Book, quantity: number) => void;
  onOpenAccount?: () => void;
  isPage?: boolean;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  book,
  allBooks,
  onClose,
  onSelectBook,
  onBuyNow,
  onOpenAccount,
  isPage = false,
}) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const { getBookDisplayName, language } = useLanguage();
  const { user, profile } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(book.cover_image || book.image);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'specifications'>('description');

  // Dynamic reviews state
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(book.reviewCount || 0);
  const [averageRating, setAverageRating] = useState(book.rating || 5.0);

  // Review Form state
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState<boolean>(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean>(false);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewTextInput, setReviewTextInput] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState<string | null>(null);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

  const isWished = isInWishlist(book.id);
  const displayName = getBookDisplayName(book);

  // Load reviews from Supabase when book changes
  useEffect(() => {
    if (!book?.id) return;
    setReviewsLoading(true);
    reviewService.getBookReviews(book.id).then((res) => {
      setReviewsLoading(false);
      if (res.success) {
        setReviews(res.reviews);
        setReviewCount(res.count);
        setAverageRating(res.rating);
      }
    }).catch(() => {
      setReviewsLoading(false);
    });
  }, [book?.id]);

  // Check purchase eligibility when user or book changes
  useEffect(() => {
    if (!book?.id) return;
    if (!user && !profile) {
      setIsEligible(false);
      setAlreadyReviewed(false);
      return;
    }

    setIsCheckingEligibility(true);
    reviewService.checkEligibility({
      bookId: book.id,
      userId: user?.id,
      email: user?.email || profile?.email,
      phone: user?.phone || profile?.phone,
    }).then((res) => {
      setIsCheckingEligibility(false);
      setIsEligible(res.eligible);
      setAlreadyReviewed(res.alreadyReviewed);
      if (res.existingReview) {
        setRatingInput(Number(res.existingReview.rating) || 5);
        setReviewTextInput(res.existingReview.review_text || '');
      }
    }).catch(() => {
      setIsCheckingEligibility(false);
    });
  }, [book?.id, user?.id, user?.email, profile?.email, profile?.phone]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTextInput.trim()) {
      setReviewSubmitError('অনুগ্রহ করে আপনার রিভিউ মন্তব্যটি লিখুন');
      return;
    }

    setIsSubmittingReview(true);
    setReviewSubmitError(null);
    setReviewSubmitMessage(null);

    const userName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'সম্মানিত পাঠক';
    const userEmail = user?.email || profile?.email || '';
    const userPhone = user?.phone || profile?.phone || '';

    const res = await reviewService.submitReview({
      book_id: book.id,
      rating: ratingInput,
      review_text: reviewTextInput.trim(),
      user_id: user?.id,
      user_name: userName,
      user_email: userEmail,
      user_phone: userPhone,
    });

    setIsSubmittingReview(false);

    if (res.success && res.review) {
      setReviewSubmitMessage(res.message || 'আপনার রিভিউটি সফলভাবে প্রকাশিত হয়েছে!');
      setAlreadyReviewed(true);

      // Refresh reviews list
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.id !== res.review?.id && r.user_id !== res.review?.user_id);
        return [res.review!, ...filtered];
      });

      // Recalculate average
      setReviews((latest) => {
        const count = latest.length;
        const sum = latest.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        const newAvg = Number((sum / count).toFixed(1));
        setReviewCount(count);
        setAverageRating(newAvg);
        return latest;
      });

      showToast('আপনার রিভিউ সফলভাবে যুক্ত হয়েছে!', 'success');
    } else {
      setReviewSubmitError(res.error || 'রিভিউ সাবমিট করতে সমস্যা হয়েছে');
    }
  };

  useEffect(() => {
    if (book) {
      trackViewContent(book);
      trackGA4ViewItem(book);
      setQuantity(book.stock > 0 ? 1 : 0);
      setActiveImage(book.cover_image || book.image);
    }
  }, [book?.id, book?.stock, book?.image, book?.cover_image]);

  // Gallery images (fallback to main cover)
  const gallery = book.gallery && book.gallery.length > 0 ? book.gallery : [book.cover_image || book.image].filter(Boolean);

  // Related books based on category or author
  const relatedBooks = allBooks
    .filter((b) => b.id !== book.id && (matchesCategory(b.category, b.tags, book.category) || matchesAuthor(b.author, book.author)))
    .slice(0, 4);

  const [isCopied, setIsCopied] = useState(false);

  // Determine canonical/unique book URL
  const bookSlug = getBookSlug(book);
  const bookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${encodeURIComponent(bookSlug)}`
    : getBookUrl(book);
  const whatsappShareUrl = getWhatsAppShareUrl(book, bookUrl);

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      showToast('বইয়ের লিংক সফলভাবে কপি করা হয়েছে!', 'success');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast('লিংক কপি করা সম্ভব হয়নি, ম্যানুয়ালি কপি করুন।', 'error');
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(bookUrl).then(() => {
        setIsCopied(true);
        showToast('বইয়ের লিংক সফলভাবে কপি করা হয়েছে!', 'success');
        setTimeout(() => setIsCopied(false), 2500);
      }).catch(() => {
        fallbackCopy(bookUrl);
      });
      return;
    }
    fallbackCopy(bookUrl);
  };

  const handleShareBook = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${book.title} — ${book.author}`,
          text: `শেষের পাতা থেকে কিনুন "${book.title}" (লেখক: ${book.author})`,
          url: bookUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    handleCopyLink();
  };

  const renderContent = () => (
    <div className="relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 flex flex-col">
      {/* Header Close Button / Back Button */}
      {isPage ? (
        <div className="p-4 sm:p-6 pb-0 flex items-center justify-between border-b border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমপেজে ফিরে যান</span>
          </button>
          <span className="text-xs text-zinc-500 font-medium">বইয়ের বিস্তারিত তথ্য</span>
        </div>
      ) : (
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-8">
          {/* Top Section: Gallery + Main Specs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Book Image Gallery */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-200 shadow-xl">
                <img
                  src={activeImage}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
                {book.discount > 0 && (
                  <div className="absolute top-3 left-3 bg-[#DC2626] text-white text-xs font-black px-2.5 py-1 rounded-md shadow-sm">
                    {toBengaliNumber(book.discount)}% ছাড়
                  </div>
                )}
              </div>

              {/* Thumbnails if gallery exists */}
              {gallery.length > 1 && (
                <div className="flex items-center gap-2 mt-3">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`w-14 h-18 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImage === img ? 'border-amber-500 scale-105' : 'border-zinc-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="প্রিভিউ" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Book Info Column */}
            <div className="md:col-span-7 flex flex-col">
              {/* Category & Rating */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-amber-100/70 text-amber-900 text-xs font-bold">
                  {book.category}
                </span>

                <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-bold text-zinc-900">{toBengaliNumber(book.rating)}</span>
                  <span className="text-zinc-400">({toBengaliNumber(book.reviewCount)} রিভিউ)</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] leading-tight mb-1 font-['Noto_Sans_Bengali']">
                {displayName}
              </h1>

              {/* Author & Publisher */}
              <p className="text-sm sm:text-base text-zinc-700 font-medium mb-1">
                লেখক: <span className="font-bold text-amber-800">{book.author}</span>
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 mb-4">
                প্রকাশনী: <span className="font-semibold text-zinc-700">{book.publisher}</span>
                {book.edition && ` • সংস্করণ: ${book.edition}`}
              </p>

              {/* Pricing */}
              <div className="flex items-baseline gap-3 p-4 rounded-2xl bg-[#FAF8F4] border border-amber-200/60 mb-6">
                <span className="text-2xl sm:text-3xl font-black text-[#18181B]">
                  {formatPrice(book.price)}
                </span>
                {book.originalPrice > book.price && (
                  <span className="text-sm sm:text-base text-zinc-400 line-through">
                    {formatPrice(book.originalPrice)}
                  </span>
                )}
                {book.discount > 0 && (
                  <span className="text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                    সেভ {formatPrice(book.originalPrice - book.price)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {book.stock <= 0 ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>স্টক শেষ (বর্তমানে স্টকে নেই)</span>
                  </div>
                ) : book.stock <= 5 ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>সীমিত স্টক — মাত্র {toBengaliNumber(book.stock)} টি কপি বাকি আছে!</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ইন স্টক ({toBengaliNumber(book.stock)} টি কপি উপলব্ধ)</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector & Action Buttons */}
              <div className="space-y-4">
                {book.stock > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700">পরিমাণ:</span>
                    <div className="flex items-center rounded-xl border border-zinc-300 bg-zinc-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="px-3 py-1.5 text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors cursor-pointer"
                        title="১ কমান"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 font-bold text-sm text-zinc-900">
                        {toBengaliNumber(quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(book.stock, q + 1))}
                        disabled={quantity >= book.stock}
                        className="px-3 py-1.5 text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors cursor-pointer"
                        title="১ বাড়ান"
                      >
                        +
                      </button>
                    </div>
                    {book.stock <= 5 && (
                      <span className="text-xs text-amber-700 font-medium">
                        (সর্বোচ্চ {toBengaliNumber(book.stock)} টি)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>দুঃখিত, এই বইটি এই মুহূর্তে স্টকে নেই। নতুন কপি আসা মাত্রই পুনরায় ক্রয় করা যাবে।</span>
                  </div>
                )}

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={book.stock <= 0}
                    onClick={() => {
                      if (book.stock > 0) {
                        addToCart(book, quantity);
                      }
                    }}
                    className={`flex-1 min-w-[140px] px-6 py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-sm ${
                      book.stock <= 0
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                        : 'bg-[#E5A913] hover:bg-[#D99600] text-zinc-950 cursor-pointer active:scale-95'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{book.stock <= 0 ? 'স্টক শেষ' : 'কার্টে যোগ করুন'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={book.stock <= 0}
                    onClick={() => {
                      if (book.stock > 0) {
                        onBuyNow(book, quantity);
                        if (!isPage) {
                          onClose();
                        }
                      }
                    }}
                    className={`flex-1 min-w-[140px] px-6 py-3 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                      book.stock <= 0
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                        : 'bg-[#18181B] hover:bg-zinc-800 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    <span>{book.stock <= 0 ? 'উপলব্ধ নেই' : 'এখনই কিনুন'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Wishlist */}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(book)}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                      isWished
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                    }`}
                    title="উইশলিস্ট"
                  >
                    <Heart className={`w-5 h-5 ${isWished ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Individual Book Sharing Buttons: WhatsApp Share, Copy Link, Native Share */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    title="WhatsApp-এ শেয়ার করুন"
                  >
                    <img
                      src="/images/whatsapp-icon.png"
                      alt="WhatsApp"
                      width={18}
                      height={18}
                      className="w-4 h-4 object-contain"
                    />
                    <span>WhatsApp-এ শেয়ার</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="বইয়ের লিংক কপি করুন"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-zinc-500" />
                        <span>লিংক কপি</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareBook}
                    className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-600 transition-colors cursor-pointer"
                    title="বইটি শেয়ার করুন"
                    aria-label="শেয়ার করুন"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Assurance / Trust badges */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-zinc-100 text-center text-[11px] text-zinc-500">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>১০০% আসল বই</span>
                </div>
                <div className="flex flex-col items-center">
                  <Truck className="w-4 h-4 text-amber-600 mb-1" />
                  <span>দ্রুততম ডেলিভারি</span>
                </div>
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-4 h-4 text-blue-600 mb-1" />
                  <span>৭ দিনে সহজ রিটার্ন</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: Tabs (Description / Specifications / Reviews) */}
          <div className="border-t border-zinc-200 pt-6">
            <div className="flex items-center gap-4 border-b border-zinc-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`pb-2 text-sm sm:text-base font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'description' ? 'text-amber-800' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                বইয়ের সারসংক্ষেপ
                {activeTab === 'description' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F59E0B] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('specifications')}
                className={`pb-2 text-sm sm:text-base font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'specifications' ? 'text-amber-800' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                বই পরিচিতি ও স্পেসিফিকেশন
                {activeTab === 'specifications' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F59E0B] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-2 text-sm sm:text-base font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'reviews' ? 'text-amber-800' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                পাঠক রিভিউ ({toBengaliNumber(reviewCount)})
                {activeTab === 'reviews' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F59E0B] rounded-full" />
                )}
              </button>
            </div>

            <div className="py-4 text-sm sm:text-base text-zinc-700 leading-relaxed">
              {activeTab === 'description' && (
                <div className="space-y-3">
                  <p>{book.description}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {book.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-zinc-50 rounded-xl flex justify-between">
                    <span className="text-zinc-500">বইয়ের শিরোনাম:</span>
                    <span className="font-semibold text-zinc-800">{book.title}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl flex justify-between">
                    <span className="text-zinc-500">লেখক:</span>
                    <span className="font-semibold text-zinc-800">{book.author}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl flex justify-between">
                    <span className="text-zinc-500">প্রকাশক:</span>
                    <span className="font-semibold text-zinc-800">{book.publisher}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl flex justify-between">
                    <span className="text-zinc-500">আইএসবিএন (ISBN):</span>
                    <span className="font-semibold text-zinc-800">{book.isbn}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl flex justify-between">
                    <span className="text-zinc-500">পৃষ্ঠা সংখ্যা:</span>
                    <span className="font-semibold text-zinc-800">{toBengaliNumber(book.pages || 220)} পৃষ্ঠা</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl flex justify-between">
                    <span className="text-zinc-500">ভাষা:</span>
                    <span className="font-semibold text-zinc-800">{book.language}</span>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Top Rating Summary Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-zinc-900">{toBengaliNumber(averageRating)}</span>
                        <span className="text-sm font-semibold text-zinc-500"> / ৫.০</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 my-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= Math.round(averageRating) ? 'fill-current text-amber-500' : 'text-zinc-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-zinc-600">
                        মোট {toBengaliNumber(reviewCount)}টি ভেরিফায়েড পাঠক রিভিউ
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-300/60 text-amber-900 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>১০০% ভেরিফায়েড পাঠক মূল্যায়ন</span>
                    </div>
                  </div>

                  {/* Review Submission Section */}
                  {isEligible ? (
                    <form
                      onSubmit={handleReviewSubmit}
                      className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500 fill-current" />
                          <span>
                            {alreadyReviewed
                              ? 'আপনার পূর্ববর্তী রিভিউ সম্পাদনা করুন'
                              : 'বইটি সম্পর্কে আপনার রিভিউ লিখুন'}
                          </span>
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ ভেরিফায়েড ক্রেতা
                        </span>
                      </div>

                      {/* Interactive Star Picker */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          আপনার রেটিং নির্বাচন করুন:
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRatingInput(star)}
                              className="p-1 hover:scale-110 transition-transform cursor-pointer"
                              title={`${star} স্টার`}
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${
                                  star <= (hoverRating || ratingInput)
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-zinc-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-zinc-700 ml-2">
                            ({toBengaliNumber(ratingInput)} স্টার)
                          </span>
                        </div>
                      </div>

                      {/* Review Text */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          আপনার বিস্তারিত মতামত:
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={reviewTextInput}
                          onChange={(e) => setReviewTextInput(e.target.value)}
                          placeholder="বইটির ভাষা, বিষয়বস্তু, প্রিন্টিং ও বাঁধাইয়ের মান সম্পর্কে আপনার অভিজ্ঞতা লিখুন..."
                          className="w-full p-3 rounded-xl border border-zinc-200 text-xs sm:text-sm bg-zinc-50 focus:bg-white focus:border-amber-500 outline-none transition-colors"
                        />
                      </div>

                      {reviewSubmitError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>{reviewSubmitError}</span>
                        </div>
                      )}

                      {reviewSubmitMessage && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>{reviewSubmitMessage}</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingReview ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>সংরক্ষণ হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{alreadyReviewed ? 'রিভিউ আপডেট করুন' : 'রিভিউ জমা দিন'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : !user && !profile ? (
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800">রিভিউ প্রদান করতে চান?</p>
                          <p className="text-zinc-500">শুধুমাত্র বইটির ভেরিফায়েড ক্রেতাগণ রিভিউ প্রদান করতে পারবেন।</p>
                        </div>
                      </div>
                      {onOpenAccount && (
                        <button
                          type="button"
                          onClick={onOpenAccount}
                          className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
                        >
                          লগইন করুন
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#FAF8F4] border border-amber-200/70 text-xs text-zinc-600 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                      <div>
                        <p className="font-bold text-zinc-800">ভেরিফায়েড ক্রেতা মূল্যায়ন নীতিমালা</p>
                        <p className="text-[11px] text-zinc-500">
                          সম্মানিত পাঠক, আপনি এই বইটি এখনো আমাদের ওয়েবসাইট থেকে ক্রয় করেননি। রিভিউ ব্যবস্থার স্বচ্ছতা বজায় রাখতে শুধুমাত্র বইটির আসল ক্রেতাগণ রিভিউ লিখতে পারেন।
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-sm text-zinc-900 border-b border-zinc-100 pb-2">
                      পাঠকদের মন্তব্য ({toBengaliNumber(reviews.length)})
                    </h4>

                    {reviewsLoading ? (
                      <div className="p-8 text-center text-zinc-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span className="text-xs">রিভিউ লোড হচ্ছে...</span>
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-50/70 rounded-2xl border border-zinc-200/60 text-zinc-500 space-y-1">
                        <Star className="w-6 h-6 text-zinc-300 mx-auto stroke-1" />
                        <p className="font-bold text-zinc-700 text-xs sm:text-sm">এখনো কোনো রিভিউ দেওয়া হয়নি।</p>
                        <p className="text-[11px] text-zinc-400">
                          আপনি যদি বইটি পড়ে থাকেন বা অর্ডার করে থাকেন, তবে সবার আগে আপনার মূল্যায়ন জানান!
                        </p>
                      </div>
                    ) : (
                      reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 border border-zinc-100 rounded-2xl bg-white shadow-2xs space-y-2 hover:border-amber-200/80 transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900">{rev.user_name || 'সম্মানিত পাঠক'}</span>
                              {rev.is_verified_purchase && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200/80 flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                                  ভেরিফায়েড ক্রেতা
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-400 text-[11px]">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString('bn-BD') : ''}
                            </span>
                          </div>

                          <div className="flex text-amber-500">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i <= Number(rev.rating) ? 'fill-current text-amber-500' : 'text-zinc-200'
                                }`}
                              />
                            ))}
                          </div>

                          <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                            {rev.review_text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Books */}
          {relatedBooks.length > 0 && (
            <div className="border-t border-zinc-200 pt-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-3">
                সম্পর্কিত বইসমূহ
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedBooks.map((relBook) => (
                  <div
                    key={relBook.id}
                    onClick={() => {
                      onSelectBook(relBook);
                      setActiveImage(relBook.image);
                      setQuantity(1);
                    }}
                    className="p-2.5 rounded-xl border border-zinc-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group"
                  >
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-zinc-100 mb-2">
                      <img
                        src={relBook.image}
                        alt={relBook.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 truncate group-hover:text-amber-800">
                      {relBook.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 truncate">{relBook.author}</p>
                    <span className="text-xs font-black text-amber-800 mt-1 block">
                      {formatPrice(relBook.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

  if (isPage) {
    return (
      <div className="w-full max-w-4xl mx-auto py-2 sm:py-6 px-3 sm:px-6">
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-4xl my-auto max-h-[92vh] flex flex-col"
      >
        {renderContent()}
      </motion.div>
    </div>
  );
};
