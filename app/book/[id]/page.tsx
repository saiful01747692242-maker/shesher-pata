import React, { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BOOKS } from '../../../src/data/books';
import { Book } from '../../../src/types';
import { getServerSupabaseClient } from '../../../src/lib/serverSupabase';
import { rowToBook } from '../../../src/services/bookService';
import { getBookSlug, getBookUrl } from '../../../src/utils/bookUrl';
import BookDetailClient from './BookDetailClient';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://shesherpata.com').replace(/\/+$/, '');
const FALLBACK_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Robustly resolve a book's cover image to an absolute, publicly accessible HTTPS URL.
 * Priority:
 * 1. book.cover_image
 * 2. book.image
 * 3. Supabase Storage public URL
 * 4. Branded fallback OG image
 */
function resolveBookOgImage(book: Book | null): string {
  if (!book) return FALLBACK_OG_IMAGE;

  const raw = (book.cover_image || book.image || '').trim();
  if (!raw) return FALLBACK_OG_IMAGE;

  // Already absolute HTTPS URL
  if (raw.startsWith('https://')) return raw;

  // Upgrade HTTP to HTTPS
  if (raw.startsWith('http://')) return raw.replace(/^http:\/\//i, 'https://');

  // Relative public asset path
  if (raw.startsWith('/')) return `${SITE_URL}${raw}`;
  if (raw.startsWith('images/')) return `${SITE_URL}/${raw}`;

  // Supabase Storage path
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ggykvfpsvqqpyluajrne.supabase.co'
  ).replace(/\/+$/, '');
  const cleanPath = raw.replace(/^book-covers\//, '');
  return `${supabaseUrl}/storage/v1/object/public/book-covers/${cleanPath}`;
}

function getBookDescription(book: Book): string {
  const clean = (book.description || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Keep a useful piece of the book synopsis, but add purchase-relevant facts
  // so search snippets explain who wrote it and where it can be ordered.
  const details = [
    book.author ? `লেখক: ${book.author}` : '',
    book.publisher ? `প্রকাশক: ${book.publisher}` : '',
    book.price ? `মূল্য: ৳${book.price}` : '',
    'শেষের পাতা থেকে অর্ডার করুন',
  ].filter(Boolean).join(' • ');

  if (clean.length > 20) {
    const available = Math.max(45, 158 - details.length - 1);
    const summary = clean.length > available
      ? `${clean.substring(0, available).replace(/[\\s,।;:-]+$/, '')}…`
      : clean;
    return `${summary} ${details}`.trim();
  }

  const parts = [`"${book.title}"`];
  if (book.category) parts.push(`বিভাগ: ${book.category}`);
  if (details) parts.push(details);
  return parts.join(' • ');
}

const fetchBook = cache(async (identifier: string): Promise<Book | null> => {
  const decoded = decodeURIComponent(identifier || '').trim();
  if (!decoded) return null;

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      // 1. Exact match on slug or id
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .or(`slug.eq.${decoded},id.eq.${decoded}`)
        .maybeSingle();

      if (!error && data) {
        return rowToBook(data);
      }

      // 2. Trailing candidate ID extraction (e.g. boi-er-naam-123 or name-bb-book-01)
      const lastHyphen = decoded.lastIndexOf('-');
      if (lastHyphen > 0) {
        const candidateId = decoded.substring(lastHyphen + 1).trim();
        if (candidateId) {
          const { data: byCandidate, error: candErr } = await supabase
            .from('books')
            .select('*')
            .eq('id', candidateId)
            .maybeSingle();

          if (!candErr && byCandidate) {
            return rowToBook(byCandidate);
          }
        }
      }
    } catch (err) {
      console.warn(`[BookPage] Supabase fetch error for identifier ${decoded}:`, err);
    }
  }

  // Fallback to static catalog if Supabase offline or not matched
  return (
    BOOKS.find(
      (b) =>
        b.slug === decoded ||
        b.id === decoded ||
        getBookSlug(b) === decoded ||
        decoded.endsWith('-' + b.id)
    ) || null
  );
});

function getBookPageTitle(book: Book): string {
  const brand = ' | শেষের পাতা';
  const author = (book.author || '').trim();
  const separator = author ? ' — ' : '';
  const availableTitleLength = Math.max(12, 60 - brand.length - (author ? author.length + separator.length : 0));
  const title = (book.title || 'বই').trim();
  const shortenedTitle = title.length > availableTitleLength
    ? `${title.slice(0, availableTitleLength - 1).trimEnd()}…`
    : title;
  const candidate = `${shortenedTitle}${author ? `${separator}${author}` : ''}${brand}`;
  return candidate.length <= 60 ? candidate : `${title.slice(0, 60 - brand.length - 1).trimEnd()}…${brand}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeURIComponent(id || '').trim();
  const book = await fetchBook(decoded);

  if (!book) {
    return {
      title: 'বইয়ের বিবরণ — শেষের পাতা',
      description: 'অনলাইন বইয়ের দোকান শেষের পাতা থেকে সেরা ছাড়ে আসল বাংলা বই কিনুন।',
      alternates: {
        canonical: `${SITE_URL}/book/${encodeURIComponent(decoded)}`,
      },
      openGraph: {
        title: 'বইয়ের বিবরণ — শেষের পাতা',
        description: 'অনলাইন বইয়ের দোকান শেষের পাতা থেকে সেরা ছাড়ে আসল বাংলা বই কিনুন।',
        url: `${SITE_URL}/book/${encodeURIComponent(decoded)}`,
        siteName: 'শেষের পাতা | Shesher Pata',
        images: [
          {
            url: FALLBACK_OG_IMAGE,
            width: 1200,
            height: 630,
            alt: 'শেষের পাতা — অনলাইন বইয়ের দোকান',
            type: 'image/png',
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'বইয়ের বিবরণ — শেষের পাতা',
        description: 'অনলাইন বইয়ের দোকান শেষের পাতা থেকে সেরা ছাড়ে আসল বাংলা বই কিনুন।',
        images: [FALLBACK_OG_IMAGE],
      },
    };
  }

  const pageUrl = getBookUrl(book, SITE_URL);
  const ogImageUrl = resolveBookOgImage(book);
  const title = getBookPageTitle(book);
  const description = getBookDescription(book);

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'শেষের পাতা | Shesher Pata',
      locale: 'bn_BD',
      type: 'book',
      images: [
        {
          url: ogImageUrl,
          width: 800,
          height: 1100,
          alt: `${book.title} — ${book.author}`,
          type: ogImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function BookPage({ params }: PageProps) {
  const { id } = await params;
  const decoded = decodeURIComponent(id || '').trim();
  const book = await fetchBook(decoded);

  if (!book) {
    notFound();
  }

  // Fetch all books for related recommendations
  let allBooks: Book[] = BOOKS;
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from('books').select('*').limit(30);
      if (data && data.length > 0) {
        allBooks = data.map(rowToBook);
      }
    } catch {
      // Fallback to BOOKS
    }
  }

  const bookImageUrl = resolveBookOgImage(book);
  const bookPageUrl = getBookUrl(book, SITE_URL);
  const relatedBooks = allBooks
    .filter((candidate) => candidate.id !== book.id && (
      (book.category && candidate.category === book.category) ||
      (book.author && candidate.author === book.author)
    ))
    .filter((candidate, index, list) =>
      list.findIndex((item) => getBookSlug(item) === getBookSlug(candidate)) === index
    )
    .slice(0, 8);

  // JSON-LD structured data for Google Books Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    url: bookPageUrl,
    author: {
      '@type': 'Person',
      name: book.author,
    },
    publisher: {
      '@type': 'Organization',
      name: book.publisher,
    },
    image: bookImageUrl,
    isbn: book.isbn,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: book.price,
      availability: book.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: bookPageUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookDetailClient book={book} allBooks={allBooks} />
      {relatedBooks.length > 0 && (
        <nav aria-label="সম্পর্কিত বই" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          <h2 className="text-lg font-bold text-zinc-900 mb-3">আরও পড়ুন</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {relatedBooks.map((relatedBook) => (
              <li key={relatedBook.id}>
                <a
                  href={getBookUrl(relatedBook, SITE_URL)}
                  className="text-sm text-amber-800 hover:text-amber-950 underline underline-offset-2"
                >
                  {relatedBook.title}
                </a>
                {relatedBook.author && (
                  <p className="text-xs text-zinc-500 mt-1">{relatedBook.author}</p>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
