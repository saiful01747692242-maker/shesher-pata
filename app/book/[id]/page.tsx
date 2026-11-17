import React, { cache } from 'react';
import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BOOKS } from '../../../src/data/books';
import { Book } from '../../../src/types';
import { getServerSupabaseClient } from '../../../src/lib/serverSupabase';
import { rowToBook } from '../../../src/services/bookService';
import { getBookSlug, getBookUrl } from '../../../src/utils/bookUrl';
import { getRealReviewStats } from '../../../src/lib/serverPublicData';
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

function getBookSeoName(book: Book): string {
  const source = (book.title_bn || book.bangla_name || book.title || 'বই').trim();
  const primary = source.split(/\\s+\\|\\s+/)[0].trim();
  // Prefer the Bengali book name over a duplicated Romanized title suffix.
  return /[\\u0980-\\u09FF]/.test(primary) ? primary : source;
}

function getBookDescription(book: Book): string {
  // Use the same text the page shows to visitors (book.description). description_bn is only a fallback,
  // because it can hold unrelated text if it was imported incorrectly.
  const clean = (book.description || book.description_bn || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();

  const details = [
    book.author ? `লেখক: ${book.author}` : '',
    Number(book.price) > 0 ? `দাম: ৳${Number(book.price)}` : '',
  ].filter(Boolean).join(' • ');
  const callToAction = 'শেষের পাতা থেকে অর্ডার করুন';
  const tail = [details, callToAction].filter(Boolean).join(' • ');
  const maxLength = 160;
  const availableSummary = Math.max(0, maxLength - tail.length - (tail ? 1 : 0));
  const source = clean || `${getBookSeoName(book)} বইয়ের বিস্তারিত ও অর্ডারের তথ্য দেখুন।`;
  const summary = source.length > availableSummary
    ? `${source.slice(0, Math.max(0, availableSummary - 1)).trimEnd()}…`
    : source;
  const result = [summary, tail].filter(Boolean).join(' ');
  return result.length > maxLength
    ? `${result.slice(0, maxLength - 1).trimEnd()}…`
    : result;
}

function normalizeBookMatchText(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function findStaticBookBySlug(identifier: string): Book | undefined {
  return BOOKS.find(
    (book) =>
      book.slug === identifier ||
      book.id === identifier ||
      getBookSlug(book) === identifier ||
      identifier.endsWith('-' + book.id)
  );
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

      // 2. Resolve a previously used slug and redirect it to the current canonical URL.
      const { data: previousSlugBook, error: previousSlugError } = await supabase
        .from('books')
        .select('*')
        .contains('slug_history', [decoded])
        .maybeSingle();

      if (!previousSlugError && previousSlugBook) {
        return rowToBook(previousSlugBook);
      }

      // 3. Trailing candidate ID extraction (e.g. boi-er-naam-123 or name-bb-book-01)
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

      // 4. Resolve a legacy static-catalog URL to a unique active database listing.
      // Ambiguous title/author matches are deliberately left untouched.
      const staticBook = findStaticBookBySlug(decoded);
      if (staticBook) {
        const staticTitle = normalizeBookMatchText(staticBook.title_bn || staticBook.bangla_name || staticBook.title);
        const staticAuthor = normalizeBookMatchText(staticBook.author);
        if (staticTitle && staticAuthor) {
          const { data: publishedBooks, error: legacyError } = await supabase
            .from('books')
            .select('*')
            .eq('is_active', true)
            .eq('status', 'published');

          if (!legacyError && publishedBooks) {
            const matches = publishedBooks.filter((row: any) => {
              if (normalizeBookMatchText(row.author) !== staticAuthor) return false;
              return [row.title_bn, row.bangla_name, row.title, row.english_name]
                .some((candidate) => {
                  const normalized = normalizeBookMatchText(candidate);
                  return normalized === staticTitle || normalized.startsWith(staticTitle);
                });
            });

            if (matches.length === 1 && matches[0].slug) {
              return rowToBook(matches[0]);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[BookPage] Supabase fetch error for identifier ${decoded}:`, err);
    }
  }

  // Keep the static catalogue as a fallback when Supabase is unavailable or no unique match exists.
  return findStaticBookBySlug(decoded) || null;
});

function getBookPageTitle(book: Book): string {
  const brand = ' | শেষের পাতা';
  const title = getBookSeoName(book);
  const author = (book.author || '').trim();
  const withAuthor = `${title}${author ? ` — ${author}` : ''}${brand}`;

  if (withAuthor.length <= 60) return withAuthor;
  if (title.length + brand.length <= 60) return `${title}${brand}`;

  const maxTitleLength = 60 - brand.length - 1;
  const prefix = title.slice(0, maxTitleLength);
  const lastWordBoundary = prefix.lastIndexOf(' ');
  const safePrefix = lastWordBoundary >= Math.floor(prefix.length * 0.55)
    ? prefix.slice(0, lastWordBoundary).trimEnd()
    : prefix.trimEnd();

  return `${safePrefix}…${brand}`;
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
  const title = book.seo_title?.trim() || getBookPageTitle(book);
  const description = book.meta_description?.trim() || getBookDescription(book);

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

  // Permanently redirect a previously used custom slug to the book's current canonical URL.
  if (book.slug_history?.includes(decoded) && getBookSlug(book) !== decoded) {
    permanentRedirect(getBookUrl(book, SITE_URL));
  }

  // Permanently consolidate legacy static-catalog URLs when a unique database listing was resolved.
  const legacyStaticBook = findStaticBookBySlug(decoded);
  // A legacy static-catalog ID can differ from the active database listing ID.
  // Compare both IDs and slugs so a resolved database listing always redirects
  // to its persisted canonical URL, even when slug normalization is unchanged.
  if (
    legacyStaticBook &&
    (book.id !== legacyStaticBook.id || getBookSlug(book) !== decoded)
  ) {
    permanentRedirect(getBookUrl(book, SITE_URL));
  }

  // Fetch all books for related recommendations
  let allBooks: Book[] = BOOKS;
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from('books').select('id, slug, title, title_bn, bangla_name, english_name, author, publisher, category, image, cover_image, price, original_price, old_price, discount, rating, review_count, stock, isbn, pages, edition, language, tags, is_bestseller, is_new, is_new_release, is_featured, featured, is_international, is_active, status, section_ids, created_at, updated_at').limit(30);
      if (data && data.length > 0) {
        allBooks = data.map(rowToBook);
      }
    } catch {
      // Fallback to BOOKS
    }
  }

  const bookImageUrl = resolveBookOgImage(book);
  const bookPageUrl = getBookUrl(book, SITE_URL);


  // Book + Product structured data helps search engines understand the title and its offer.
  const description = getBookDescription(book);
  // Only real, stored reviews may appear in structured data (never the display-only counters on the book row).
  const reviewStats = await getRealReviewStats(book.id);
  const categoryName = (book.category || '').trim();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Book',
        name: getBookSeoName(book),
        url: bookPageUrl,
        author: book.author ? { '@type': 'Person', name: book.author } : undefined,
        publisher: book.publisher ? { '@type': 'Organization', name: book.publisher } : undefined,
        image: bookImageUrl,
        isbn: book.isbn || undefined,
        inLanguage: book.language === 'English' || book.language === 'ইংরেজি' ? 'en' : 'bn',
        numberOfPages: Number(book.pages) > 0 ? Number(book.pages) : undefined,
      },
      {
        '@type': 'Product',
        name: getBookSeoName(book),
        description,
        image: [bookImageUrl],
        sku: book.id,
        brand: book.publisher ? { '@type': 'Brand', name: book.publisher } : undefined,
        category: categoryName || undefined,
        aggregateRating: reviewStats
          ? {
              '@type': 'AggregateRating',
              ratingValue: reviewStats.average,
              reviewCount: reviewStats.count,
            }
          : undefined,
        offers: Number(book.price) > 0 ? {
          '@type': 'Offer',
          url: bookPageUrl,
          priceCurrency: 'BDT',
          price: Number(book.price),
          itemCondition: 'https://schema.org/NewCondition',
          availability: Number(book.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: 'শেষের পাতা', url: SITE_URL },
        } : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'হোম', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: getBookSeoName(book), item: bookPageUrl },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <BookDetailClient book={book} allBooks={allBooks} />
  </>
  );
}
