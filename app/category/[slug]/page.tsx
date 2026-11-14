import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BOOKS } from '../../../src/data/books';
import type { Book } from '../../../src/types';
import { getServerSupabaseClient } from '../../../src/lib/serverSupabase';
import { rowToBook } from '../../../src/services/bookService';
import { getBookSlug, transliterateBengaliToSlug } from '../../../src/utils/bookUrl';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://shesherpata.com').replace(/\/+$/, '');
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchBooks(): Promise<Book[]> {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) return data.map(rowToBook);
    } catch {
      // Use the bundled catalog if the database is temporarily unavailable.
    }
  }
  return BOOKS;
}

function findCategoryBooks(slug: string, books: Book[]): Book[] {
  return books.filter((book) => book.category && transliterateBengaliToSlug(book.category) === slug);
}

function categoryDescription(name: string, count: number): string {
  const descriptions: Record<string, string> = {
    'উপন্যাস': 'বাংলা সাহিত্যের জনপ্রিয় উপন্যাস, সমকালীন গল্প এবং নির্বাচিত কথাসাহিত্যের বই এক জায়গায় খুঁজে নিন।',
    'থ্রিলার ও রহস্য': 'রহস্য, গোয়েন্দা কাহিনি, অপরাধ ও রোমাঞ্চপ্রিয় পাঠকদের জন্য নির্বাচিত বইয়ের সংগ্রহ।',
    'ইসলামিক সাহিত্য': 'ইসলামিক জ্ঞান, ইতিহাস, আত্মশুদ্ধি ও চিন্তাশীল পাঠের জন্য নির্বাচিত বই।',
    'কবিতা': 'বাংলা কবিতা, কাব্যগ্রন্থ ও কবিদের নির্বাচিত রচনার সংগ্রহ।',
    'ইংরেজি ও অনুবাদ': 'বিশ্বসাহিত্যের ইংরেজি বই এবং অনুবাদ গ্রন্থের নির্বাচিত সংগ্রহ।',
    'আত্মউন্নয়ন': 'ব্যক্তিগত উন্নয়ন, জীবনবোধ ও আত্ম-অনুসন্ধান বিষয়ক বইয়ের সংগ্রহ।',
    'সাধারণ': 'বিভিন্ন বিষয় ও পাঠরুচির জন্য নির্বাচিত বইয়ের সংগ্রহ।',
  };
  return `${descriptions[name] || `${name} বিভাগের নির্বাচিত বইয়ের সংগ্রহ।`} বর্তমানে এই বিভাগে ${count}টি বই পাওয়া যাচ্ছে।`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const books = await fetchBooks();
  const categoryBooks = findCategoryBooks(slug, books);
  const categoryName = categoryBooks[0]?.category;

  if (!categoryName) {
    return {
      title: 'বইয়ের বিভাগ | শেষের পাতা',
      robots: { index: false, follow: true },
    };
  }

  const title = `${categoryName} বই | শেষের পাতা`;
  const description = categoryDescription(categoryName, categoryBooks.length);
  const canonical = `${SITE_URL}/category/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'শেষের পাতা | Shesher Pata',
      locale: 'bn_BD',
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const books = await fetchBooks();
  const categoryBooks = findCategoryBooks(slug, books);
  const categoryName = categoryBooks[0]?.category;

  if (!categoryName) notFound();

  const pageUrl = `${SITE_URL}/category/${encodeURIComponent(slug)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryName} বই`,
    description: categoryDescription(categoryName, categoryBooks.length),
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categoryBooks.length,
      itemListElement: categoryBooks.map((book, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: book.title,
        url: `${SITE_URL}/book/${encodeURIComponent(getBookSlug(book))}`,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#FEFDF9] text-zinc-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-zinc-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-amber-700">হোম</Link></li>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-zinc-800">{categoryName}</li>
          </ol>
        </nav>

        <header className="mb-7 border-b border-amber-100 pb-6">
          <p className="mb-2 text-sm font-bold text-amber-700">শেষের পাতা · বইয়ের বিভাগ</p>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">{categoryName} বই</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
            {categoryDescription(categoryName, categoryBooks.length)}
          </p>
          <p className="mt-3 text-sm font-semibold text-zinc-500">{categoryBooks.length}টি বই</p>
        </header>

        <section aria-label={`${categoryName} বইয়ের তালিকা`} className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {categoryBooks.map((book) => {
            const href = `/book/${encodeURIComponent(getBookSlug(book))}`;
            const image = book.cover_image || book.image || '/og-image.png';
            return (
              <article key={book.id} className="overflow-hidden rounded-2xl border border-[#E8E3D5] bg-white shadow-sm transition-shadow hover:shadow-md">
                <Link href={href} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F1E8]">
                    <Image
                      src={image}
                      alt={`${book.title} — ${book.author}`}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 18vw"
                      className="object-contain p-3"
                    />
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-2 min-h-11 text-sm font-bold leading-6 text-zinc-900 sm:text-base">{book.title}</h2>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-500">লেখক: {book.author}</p>
                    <p className="mt-3 font-black text-amber-800">৳{Number(book.price || 0).toLocaleString('bn-BD')}</p>
                  </div>
                </Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
