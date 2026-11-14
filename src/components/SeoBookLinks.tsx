import 'server-only';

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '../lib/serverEnv';
import { getBookSlug, transliterateBengaliToSlug } from '../utils/bookUrl';
import { BOOKS } from '../data/books';

type SeoBook = {
  id: string;
  slug?: string | null;
  title?: string | null;
  english_name?: string | null;
  author?: string | null;
  category?: string | null;
  updated_at?: string | null;
};

type SearchLinkData = {
  books: SeoBook[];
  categories: string[];
};

async function getSearchLinkData(): Promise<SearchLinkData> {
  const env = getServerEnv();
  if (env.supabaseUrl && env.supabaseAnonKey) {
    try {
      // Use only the public anon key; never expose or use the service-role key here.
      const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase
        .from('books')
        .select('id, slug, title, english_name, author, category, is_active, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (!error && data?.length) {
        const allBooks = data as SeoBook[];
        const categories = Array.from(
          new Set(allBooks.map((book) => book.category?.trim()).filter((name): name is string => Boolean(name)))
        ).sort((a, b) => a.localeCompare(b, 'bn'));

        return { books: allBooks.slice(0, 16), categories };
      }
    } catch {
      // Use the public static catalogue as a safe fallback.
    }
  }

  const fallbackBooks: SeoBook[] = BOOKS.map((book) => ({
    id: book.id,
    slug: book.slug,
    title: book.title,
    english_name: book.english_name,
    author: book.author,
    category: book.category,
  }));
  const categories = Array.from(
    new Set(fallbackBooks.map((book) => book.category?.trim()).filter((name): name is string => Boolean(name)))
  ).sort((a, b) => a.localeCompare(b, 'bn'));

  return { books: fallbackBooks.slice(0, 16), categories };
}

export async function SeoBookLinks() {
  const { books, categories } = await getSearchLinkData();
  if (!books.length && !categories.length) return null;

  return (
    <section
      aria-labelledby="discover-more-books"
      className="w-full border-t border-[#E8E3D5] bg-[#FAF8F4] py-8"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {categories.length > 0 ? (
          <nav aria-label="বইয়ের বিভাগ" className="mb-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">বইয়ের বিভাগ</h2>
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category}>
                  <Link
                    href={`/category/${encodeURIComponent(transliterateBengaliToSlug(category))}`}
                    className="inline-flex rounded-full border border-[#E8E3D5] bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-amber-400 hover:text-amber-800"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {books.length > 0 ? (
          <>
            <h2 id="discover-more-books" className="mb-2 text-lg font-bold text-zinc-900">
              আরও বই আবিষ্কার করুন
            </h2>
            <p className="mb-4 text-sm text-zinc-600">
              বাংলা ও বিশ্বসাহিত্যের নির্বাচিত বইয়ের সংগ্রহ দেখুন।
            </p>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {books.map((book) => {
                const slug = getBookSlug({
                  id: String(book.id),
                  slug: book.slug || undefined,
                  title: book.title || '',
                  english_name: book.english_name || undefined,
                });
                const title = book.title || book.english_name || 'বই দেখুন';
                return (
                  <li key={book.id}>
                    <Link
                      href={`/book/${encodeURIComponent(slug)}`}
                      className="text-sm text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-amber-700"
                    >
                      {title}
                    </Link>
                    {book.author ? (
                      <span className="block text-xs text-zinc-500">{book.author}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
