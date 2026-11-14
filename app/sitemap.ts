import { MetadataRoute } from 'next';
import { getServerSupabaseClient } from '../src/lib/serverSupabase';
import { BOOKS } from '../src/data/books';
import { getBookSlug } from '../src/utils/bookUrl';

// Read the sitemap at request time so books published in Supabase appear
// without requiring a new website deployment.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://shesherpata.com').replace(/\\/+$/, '');

  interface SitemapBookEntry {
    slug: string;
    updatedAt: Date;
  }

  let bookEntries: SitemapBookEntry[] = BOOKS.map((b) => ({
    slug: getBookSlug(b),
    updatedAt: new Date(),
  }));

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('books')
        .select('id, slug, title, english_name, is_active, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (data && data.length > 0) {
        bookEntries = data.map((b) => ({
          slug: getBookSlug(b),
          updatedAt: b.updated_at ? new Date(b.updated_at) : new Date(),
        }));
      }
    } catch {
      // Fallback to static books
    }
  }

  const bookUrls: MetadataRoute.Sitemap = bookEntries.map((entry) => ({
    url: `${baseUrl}/book/${encodeURIComponent(entry.slug)}`,
    lastModified: entry.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...bookUrls,
  ];
}
