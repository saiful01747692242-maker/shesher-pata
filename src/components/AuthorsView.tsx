'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Book, Author } from '../types';
import { ProductCard } from './ProductCard';
import { BookOpen, Feather } from 'lucide-react';
import { toBengaliNumber } from '../utils/formatters';
import { useData } from '../context/DataContext';
import { normalizeBengali, matchesAuthor } from '../utils/filterUtils';

interface AuthorsViewProps {
  books: Book[];
  initialAuthor?: string;
  onOpenDetails: (book: Book) => void;
  onQuickView: (book: Book) => void;
  onBuyNow?: (book: Book) => void;
  onResetToHome: () => void;
}

export const AuthorsView: React.FC<AuthorsViewProps> = ({
  books,
  initialAuthor,
  onOpenDetails,
  onQuickView,
  onBuyNow,
  onResetToHome,
}) => {
  const { authors } = useData();

  // Combine authors from authors database table and unique authors found across all books
  const allAuthors = useMemo<Author[]>(() => {
    const authorMap = new Map<string, Author>();

    // 1. Authors from database state (has rich bio, era, image, role)
    authors.forEach((auth) => {
      if (auth.name?.trim()) {
        const normKey = normalizeBengali(auth.name).toLowerCase();
        authorMap.set(normKey, {
          ...auth,
          name: normalizeBengali(auth.name),
        });
      }
    });

    // 2. Authors present in book catalog that might not have a separate entry in authors table
    books.forEach((b) => {
      const bAuth = normalizeBengali(b.author);
      if (bAuth) {
        const normKey = bAuth.toLowerCase();
        if (!authorMap.has(normKey)) {
          authorMap.set(normKey, {
            id: `author-auto-${normKey.replace(/\s+/g, '-')}`,
            name: bAuth,
            era: '',
            role: 'লেখক ও সাহিত্যিক',
            bio: `${bAuth} বাংলা ও বিশ্বসাহিত্যের জনপ্রিয় এবং সমাদৃত লেখক।`,
            image: b.image || b.cover_image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
            image_url: b.image || b.cover_image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
            bookCount: 0,
          });
        }
      }
    });

    return Array.from(authorMap.values());
  }, [authors, books]);

  const [selectedAuthor, setSelectedAuthor] = useState<string>(() => {
    if (initialAuthor && initialAuthor.trim()) {
      return normalizeBengali(initialAuthor);
    }
    return allAuthors[0]?.name || 'হুমায়ূন আহমেদ';
  });

  // Sync selected author when initialAuthor prop changes
  useEffect(() => {
    if (initialAuthor && initialAuthor.trim()) {
      setSelectedAuthor(normalizeBengali(initialAuthor));
    }
  }, [initialAuthor]);

  // Robustly filter books belonging to selected author (handles Unicode NFC/NFD, substrings, and IDs)
  const authorBooks = useMemo(() => {
    return books.filter((b) => matchesAuthor(b.author, selectedAuthor));
  }, [books, selectedAuthor]);

  // Find author bio matching selected author or generate graceful profile
  const currentBio = useMemo<Author>(() => {
    const found = allAuthors.find(
      (a) => matchesAuthor(a.name, selectedAuthor) || a.id === selectedAuthor
    );
    if (found) {
      return {
        ...found,
        bookCount: authorBooks.length,
      };
    }

    const firstBook = authorBooks[0];
    return {
      id: `author-${selectedAuthor}`,
      name: selectedAuthor,
      era: '',
      role: 'লেখক ও সাহিত্যিক',
      bio: `${selectedAuthor} বাংলা সাহিত্যের বিশিষ্ট লেখক।`,
      image: firstBook?.image || firstBook?.cover_image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
      image_url: firstBook?.image || firstBook?.cover_image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
      bookCount: authorBooks.length,
    };
  }, [allAuthors, selectedAuthor, authorBooks]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 select-none font-['Noto_Sans_Bengali']">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
        <button onClick={onResetToHome} className="hover:text-amber-700 cursor-pointer">
          হোম
        </button>
        <span>/</span>
        <span className="text-zinc-800 font-semibold">লেখক অঙ্গন</span>
        {currentBio.name && (
          <>
            <span>/</span>
            <span className="text-amber-700 font-semibold">{currentBio.name}</span>
          </>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-['Noto_Sans_Bengali']">
          জনপ্রিয় লেখক ও তাঁদের কালজয়ী বই
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          বাংলা সাহিত্যের প্রথিতযশা লেখকদের অনন্য রচনাবলি
        </p>
      </div>

      {/* Authors list carousel / pill tabs */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar pb-3 mb-6">
        {allAuthors.map((author) => {
          const isSelected = matchesAuthor(author.name, selectedAuthor) || author.id === selectedAuthor;
          const bookCount = books.filter((b) => matchesAuthor(b.author, author.name)).length;

          return (
            <button
              key={author.id || author.name}
              type="button"
              onClick={() => setSelectedAuthor(author.name)}
              className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm ${
                isSelected
                  ? 'border-amber-500 bg-amber-50 font-bold text-amber-950 shadow-xs ring-1 ring-amber-400'
                  : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
              }`}
            >
              <Feather className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-zinc-400'}`} />
              <span>{author.name}</span>
              {bookCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-amber-200 text-amber-900' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {toBengaliNumber(bookCount)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Author Profile Card */}
      <div className="p-6 bg-gradient-to-r from-[#FAF8F4] to-amber-50/40 rounded-3xl border border-amber-200/80 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-2xs">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-zinc-200 shrink-0 border border-amber-300 shadow-md">
          <img
            src={currentBio.image || currentBio.image_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80'}
            alt={currentBio.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80';
            }}
          />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 font-['Noto_Sans_Bengali']">
              {currentBio.name}
            </h2>
            {currentBio.era && (
              <span className="text-xs text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full font-semibold">
                {currentBio.era}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 font-medium mt-1">
            {currentBio.role || 'লেখক ও সাহিত্যিক'}
          </p>
          <p className="text-xs sm:text-sm text-zinc-700 mt-2 max-w-2xl leading-relaxed">
            {currentBio.bio}
          </p>
        </div>
      </div>

      {/* Author Books Grid */}
      <div>
        <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-600" />
          <span>{currentBio.name}-এর বইসমূহ ({toBengaliNumber(authorBooks.length)} টি)</span>
        </h3>

        {authorBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {authorBooks.map((book) => (
              <ProductCard
                key={book.id}
                book={book}
                onOpenDetails={onOpenDetails}
                onQuickView={onQuickView}
                onBuyNow={onBuyNow}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200 text-xs text-zinc-500">
            এই লেখকের কোনো বই পাওয়া যায়নি।
          </div>
        )}
      </div>
    </div>
  );
};
