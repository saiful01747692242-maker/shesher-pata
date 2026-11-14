import { MetadataRoute } from 'next';
import { getServerSupabaseClient } from '../src/lib/serverSupabase';
import { BOOKS } from '../src/data/books';
import { getBookSlug } from '../src/utils/bookUrl';

// Generate the sitemap at request time so newly published Supabase books appear automatically.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://shesherpata.com').replace(/\/+$/, '');

  interface SitemapBookEntry {
    slug: string;
    updatedAt: Date;
  }

  let bookEntries: SitemapBookEntry[] = BOOKS.map((book) => ({
    slug: getBookSlug(book),
    updatedAt: new Date(),
  }));

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, slug, title, english_name, is_active, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (!error && data && data.length > 0) {
        bookEntries = data.map((book) => ({
          slug: getBookSlug(book),
          updatedAt: book.updated_at ? new Date(book.updated_at) : new Date(),
        }));
      }
    } catch (error) {
      console.error('[Sitemap] Failed to load books from Supabase; using static fallback.', error);
    }
  }

  const uniqueEntries = Array.from(
    new Map(bookEntries.filter((entry) => entry.slug).map((entry) => [entry.slug, entry])).values()
  );

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...uniqueEntries.map((entry) => ({
      url: `${baseUrl}/book/${encodeURIComponent(entry.slug)}`,
      lastModified: entry.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
