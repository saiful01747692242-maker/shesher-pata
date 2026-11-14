import { MetadataRoute } from 'next';
import { getServerSupabaseClient } from '../src/lib/serverSupabase';
import { BOOKS } from '../src/data/books';
import { getBookSlug, transliterateBengaliToSlug } from '../src/utils/bookUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://shesherpata.com').replace(/\\/+$/, '');

  type SitemapBook = {
    id: string;
    slug?: string;
    title: string;
    english_name?: string;
    category?: string;
    updated_at?: string;
    is_active?: boolean;
  };

  let sitemapBooks: SitemapBook[] = BOOKS;

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, slug, title, english_name, category, is_active, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (!error && data && data.length > 0) {
        sitemapBooks = data as SitemapBook[];
      }
    } catch {
      // Keep the static catalog as a safe sitemap fallback.
    }
  }

  const bookUrls: MetadataRoute.Sitemap = sitemapBooks.map((book) => ({
    url: `${baseUrl}/book/${encodeURIComponent(getBookSlug(book))}`,
    lastModified: book.updated_at ? new Date(book.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryMap = new Map<string, { lastModified: Date }>();
  for (const book of sitemapBooks) {
    if (!book.category?.trim()) continue;
    const slug = transliterateBengaliToSlug(book.category);
    const updatedAt = book.updated_at ? new Date(book.updated_at) : new Date();
    const existing = categoryMap.get(slug);
    if (!existing || updatedAt > existing.lastModified) {
      categoryMap.set(slug, { lastModified: updatedAt });
    }
  }

  const categoryUrls: MetadataRoute.Sitemap = Array.from(categoryMap.entries()).map(([slug, entry]) => ({
    url: `${baseUrl}/category/${encodeURIComponent(slug)}`,
    lastModified: entry.lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const staticUrls: MetadataRoute.Sitemap = ['/about', '/contact', '/help', '/privacy', '/terms'].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: 'monthly',
    priority: 0.3,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...staticUrls,
    ...categoryUrls,
    ...bookUrls,
  ];
}
