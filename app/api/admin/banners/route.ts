import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isRequestAuthorized } from '../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';
import { Banner } from '../../../../src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Fetch all banners (both active and inactive) for admin management.
 */
export async function GET(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ব্যানার তালিকা দেখার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, banners: [] });
    }

    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Admin Banners GET Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized: Banner[] = (data || []).map((row: any) => ({
      id: String(row.id),
      name: row.name || row.title || 'Untitled Banner',
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

    return NextResponse.json({ success: true, banners: normalized });
  } catch (err: any) {
    console.error('[Admin Banners GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST / PUT: Save or update a banner.
 */
export async function POST(request: NextRequest) {
  return handleBannerSave(request);
}

export async function PUT(request: NextRequest) {
  return handleBannerSave(request);
}

async function handleBannerSave(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ব্যানার সংরক্ষণের জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      type,
      placement,
      title,
      subtitle,
      description,
      badge,
      badge_color,
      image_url,
      mobile_image_url,
      primary_button_text,
      primary_button_url,
      secondary_button_text,
      secondary_button_url,
      highlight_text,
      theme,
      display_order,
      is_active,
      starts_at,
      ends_at,
      target_url,
      open_in_new_tab,
      alt_text,
      design_config,
      // Legacy support
      bangla_image,
      english_image,
      status,
      sort_order,
    } = body || {};

    const cleanName = (name || title || 'New Banner').trim();
    if (!cleanName) {
      return NextResponse.json({ error: 'ব্যানারের নাম আবশ্যক।' }, { status: 400 });
    }

    const cleanId = (id && String(id).trim()) || `ban-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cleanPlacement = (placement || type || 'homepage_hero').trim();
    const cleanImage = (image_url || bangla_image || english_image || '').trim();
    const cleanMobileImage = (mobile_image_url || '').trim();
    const cleanOrder = Number(display_order ?? sort_order ?? 1);
    const cleanIsActive = is_active !== undefined ? Boolean(is_active) : status !== 'inactive';
    const now = new Date().toISOString();

    const dbPayload = {
      id: cleanId,
      name: cleanName,
      type: cleanPlacement,
      placement: cleanPlacement,
      title: (title || cleanName).trim(),
      subtitle: (subtitle || '').trim(),
      description: (description || '').trim(),
      badge: (badge || '').trim(),
      badge_color: (badge_color || '').trim(),
      image_url: cleanImage,
      mobile_image_url: cleanMobileImage,
      primary_button_text: (primary_button_text || '').trim(),
      primary_button_url: (primary_button_url || '').trim(),
      secondary_button_text: (secondary_button_text || '').trim(),
      secondary_button_url: (secondary_button_url || '').trim(),
      highlight_text: (highlight_text || '').trim(),
      theme: (theme || 'cream').trim(),
      display_order: cleanOrder,
      is_active: cleanIsActive,
      starts_at: starts_at ? new Date(starts_at).toISOString() : null,
      ends_at: ends_at ? new Date(ends_at).toISOString() : null,
      target_url: (target_url || primary_button_url || '').trim(),
      open_in_new_tab: Boolean(open_in_new_tab),
      alt_text: (alt_text || cleanName).trim(),
      design_config: typeof design_config === 'object' && design_config !== null ? design_config : {},
      updated_at: now,
    };

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'ডাটাবেজ কানেকশন পাওয়া যায়নি।' }, { status: 503 });
    }

    // Check if banner exists
    const { data: existing } = await supabase
      .from('banners')
      .select('id')
      .eq('id', cleanId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('banners')
        .update(dbPayload)
        .eq('id', cleanId);

      if (updateError) {
        console.error('[Admin Banners Update Error]:', updateError);
        return NextResponse.json({ error: `ব্যানার আপডেট ব্যর্থ: ${updateError.message}` }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('banners')
        .insert({
          ...dbPayload,
          created_at: now,
        });

      if (insertError) {
        console.error('[Admin Banners Insert Error]:', insertError);
        return NextResponse.json({ error: `ব্যানার তৈরি ব্যর্থ: ${insertError.message}` }, { status: 500 });
      }
    }

    try {
      revalidatePath('/');
      revalidatePath('/seshadmin');
      revalidatePath('/api/banners');
    } catch {}

    const resultBanner: Banner = {
      ...dbPayload,
      bangla_image: cleanImage,
      english_image: cleanImage,
      english_title: dbPayload.title,
      english_subtitle: dbPayload.subtitle,
      link: dbPayload.primary_button_url,
      status: cleanIsActive ? 'active' : 'inactive',
      sort_order: cleanOrder,
      created_at: now,
      updated_at: now,
    };

    return NextResponse.json({
      success: true,
      banner: resultBanner,
      message: `ব্যানার "${cleanName}" সফলভাবে সংরক্ষিত হয়েছে!`,
    });
  } catch (err: any) {
    console.error('[Admin Banners Save Error]:', err);
    return NextResponse.json({ error: err.message || 'ব্যানার সংরক্ষণে সমস্যা হয়েছে' }, { status: 500 });
  }
}

/**
 * DELETE: Remove a banner by unique ID.
 */
export async function DELETE(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ব্যানার মুছে ফেলার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ব্যানার আইডি আবশ্যক।' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  if (supabase) {
    // Optionally check if image exists in book-banners to clean up
    try {
      const { data: ban } = await supabase
        .from('banners')
        .select('image_url, mobile_image_url')
        .eq('id', id)
        .maybeSingle();

      if (ban?.image_url && ban.image_url.includes('book-banners')) {
        const urlParts = ban.image_url.split('/book-banners/');
        if (urlParts[1]) {
          await supabase.storage.from('book-banners').remove([decodeURIComponent(urlParts[1])]);
        }
      }
      if (ban?.mobile_image_url && ban.mobile_image_url.includes('book-banners')) {
        const mParts = ban.mobile_image_url.split('/book-banners/');
        if (mParts[1]) {
          await supabase.storage.from('book-banners').remove([decodeURIComponent(mParts[1])]);
        }
      }
    } catch (e) {
      console.warn('[Admin Banners DELETE] Image cleanup error:', e);
    }

    const { error: delError } = await supabase.from('banners').delete().eq('id', id);
    if (delError) {
      return NextResponse.json({ error: `ব্যানার মুছে ফেলা ব্যর্থ: ${delError.message}` }, { status: 500 });
    }
  }

  try {
    revalidatePath('/');
    revalidatePath('/seshadmin');
    revalidatePath('/api/banners');
  } catch {}

  return NextResponse.json({ success: true, message: 'ব্যানার সফলভাবে মুছে ফেলা হয়েছে।' });
}
