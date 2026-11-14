import 'server-only';
import { unstable_cache } from 'next/cache';
import { getServerSupabaseClient } from './serverSupabase';
import { rowToBook } from '../services/bookService';
import { DEFAULT_SETTINGS } from '../services/settingsService';
import type { Book, SiteSettings } from '../types';

/**
 * Public, read-only data used to render the first HTML response on the server.
 *
 * Why this exists: the storefront is a client-rendered app whose first render used
 * built-in demo books and placeholder contact details. Search engines received that
 * demo content. These helpers load the real records so the initial HTML is correct.
 *
 * Only columns that are already public in the browser are selected here. Results are
 * cached for five minutes to avoid hitting the database on every request.
 */

const REVALIDATE_SECONDS = 300;

const BOOK_LIST_COLUMNS =
  'id, slug, title, title_bn, bangla_name, english_name, author, publisher, category, image, cover_image, price, original_price, old_price, discount, rating, review_count, stock, isbn, pages, edition, language, tags, is_bestseller, is_new, is_new_release, is_featured, featured, is_international, is_active, status, section_ids, created_at, updated_at';

const SETTINGS_COLUMNS =
  'id, meta_pixel_id, meta_pixel_enabled, phone, alt_phone, email, address, support_hours, announcement_badge, announcement_text, about_text, facebook_url, instagram_url, whatsapp_number, steadfast_enabled, delivery_charge_inside, delivery_charge_outside, free_delivery_threshold, updated_at';

const loadPublicBooks = unstable_cache(
  async (): Promise<Book[]> => {
    const supabase = getServerSupabaseClient();
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('books')
        .select(BOOK_LIST_COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error || !data) return [];
      return data.map(rowToBook);
    } catch (err) {
      console.warn('[serverPublicData] Failed to load books:', err);
      return [];
    }
  },
  ['public-books-v1'],
  { revalidate: REVALIDATE_SECONDS, tags: ['books'] }
);

const loadPublicSettings = unstable_cache(
  async (): Promise<SiteSettings | null> => {
    const supabase = getServerSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select(SETTINGS_COLUMNS)
        .eq('id', 'default_settings')
        .maybeSingle();
      if (error || !data) return null;

      const merged: SiteSettings = {
        ...DEFAULT_SETTINGS,
        id: data.id || DEFAULT_SETTINGS.id,
        meta_pixel_id: data.meta_pixel_id || '',
        meta_pixel_enabled: Boolean(data.meta_pixel_enabled),
        phone: data.phone || DEFAULT_SETTINGS.phone,
        alt_phone: data.alt_phone || DEFAULT_SETTINGS.alt_phone,
        email: data.email || DEFAULT_SETTINGS.email,
        address: data.address || DEFAULT_SETTINGS.address,
        support_hours: data.support_hours || DEFAULT_SETTINGS.support_hours,
        announcement_badge: data.announcement_badge || DEFAULT_SETTINGS.announcement_badge,
        announcement_text: data.announcement_text || DEFAULT_SETTINGS.announcement_text,
        about_text: data.about_text || DEFAULT_SETTINGS.about_text,
        facebook_url: data.facebook_url || DEFAULT_SETTINGS.facebook_url,
        instagram_url: data.instagram_url || DEFAULT_SETTINGS.instagram_url,
        whatsapp_number: data.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number,
        steadfast_enabled: Boolean(data.steadfast_enabled),
        delivery_charge_inside:
          data.delivery_charge_inside != null ? Number(data.delivery_charge_inside) : DEFAULT_SETTINGS.delivery_charge_inside,
        delivery_charge_outside:
          data.delivery_charge_outside != null ? Number(data.delivery_charge_outside) : DEFAULT_SETTINGS.delivery_charge_outside,
        free_delivery_threshold:
          data.free_delivery_threshold != null ? Number(data.free_delivery_threshold) : DEFAULT_SETTINGS.free_delivery_threshold,
        updated_at: data.updated_at || DEFAULT_SETTINGS.updated_at,
      };
      return merged;
    } catch (err) {
      console.warn('[serverPublicData] Failed to load site settings:', err);
      return null;
    }
  },
  ['public-site-settings-v1'],
  { revalidate: REVALIDATE_SECONDS, tags: ['site-settings'] }
);

/** Active books for server-rendered listings. Empty array if the database is unreachable. */
export async function getPublicBooks(): Promise<Book[]> {
  return loadPublicBooks();
}

/** Public site settings (contact details, social links). Null if unavailable. */
export async function getPublicSiteSettings(): Promise<SiteSettings | null> {
  return loadPublicSettings();
}

/**
 * Real review statistics for one book, taken from the reviews table.
 * Returns null when there are no real reviews, so callers never publish made-up ratings.
 */
export async function getRealReviewStats(
  bookId: string
): Promise<{ count: number; average: number } | null> {
  const supabase = getServerSupabaseClient();
  if (!supabase || !bookId) return null;
  try {
    const { data, error } = await supabase.from('reviews').select('rating').eq('book_id', bookId);
    if (error || !data || data.length === 0) return null;
    const ratings = data.map((r: { rating: number | string }) => Number(r.rating)).filter((n) => Number.isFinite(n));
    if (ratings.length === 0) return null;
    const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
    return { count: ratings.length, average: Math.round(average * 10) / 10 };
  } catch {
    return null;
  }
}
