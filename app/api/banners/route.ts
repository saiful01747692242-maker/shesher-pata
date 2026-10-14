import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '../../../src/lib/serverSupabase';
import { Banner } from '../../../src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public GET: Fetch active, non-expired banners for frontend components.
 * Filterable by placement (e.g. ?placement=homepage_hero).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement');

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, banners: [] });
    }

    let query = supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (placement && placement !== 'all') {
      query = query.eq('placement', placement);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[Public Banners API] Database query error:', error.message);
      return NextResponse.json({ success: true, banners: [] });
    }

    const now = new Date();
    // Filter scheduled banners
    const activeBanners = (data || []).filter((row: any) => {
      if (row.starts_at && new Date(row.starts_at) > now) return false;
      if (row.ends_at && new Date(row.ends_at) < now) return false;
      return true;
    });

    const normalized: Banner[] = activeBanners.map((row: any) => ({
      id: String(row.id),
      name: row.name || row.title || 'Banner',
      type: row.type || row.placement || 'homepage_hero',
      placement: row.placement || row.type || 'homepage_hero',
      title: row.title || '',
      subtitle: row.subtitle || '',
      description: row.description || '',
      badge: row.badge || '',
      badge_color: row.badge_color || '',
      image_url: row.image_url || row.bangla_image || '',
      mobile_image_url: row.mobile_image_url || '',
      primary_button_text: row.primary_button_text || '',
      primary_button_url: row.primary_button_url || '',
      secondary_button_text: row.secondary_button_text || '',
      secondary_button_url: row.secondary_button_url || '',
      highlight_text: row.highlight_text || '',
      theme: row.theme || 'cream',
      display_order: Number(row.display_order ?? 1),
      is_active: Boolean(row.is_active),
      starts_at: row.starts_at || null,
      ends_at: row.ends_at || null,
      target_url: row.target_url || row.primary_button_url || '',
      open_in_new_tab: Boolean(row.open_in_new_tab),
      alt_text: row.alt_text || row.title || '',
      design_config: row.design_config || {},
      // Legacy compatibility
      bangla_image: row.image_url || row.bangla_image || '',
      english_image: row.image_url || row.english_image || '',
      english_title: row.title || '',
      english_subtitle: row.subtitle || '',
      link: row.primary_button_url || '',
      status: row.is_active ? 'active' : 'inactive',
      sort_order: Number(row.display_order ?? 1),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json(
      { success: true, banners: normalized },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    console.error('[Public Banners API Error]:', err);
    return NextResponse.json({ success: true, banners: [] });
  }
}
