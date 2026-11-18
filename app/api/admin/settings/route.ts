import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isRequestAuthorized } from '../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';
import type { SiteSettings } from '../../../../src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  if (!isRequestAuthorized(request)) {
    return NextResponse.json(
      { error: 'অননুমোদিত: শুধুমাত্র অনুমোদিত অ্যাডমিন সেটিংস পরিবর্তন করতে পারবেন।' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'অবৈধ সেটিংস ডেটা।' }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    const payload: Record<string, unknown> = {
      id: 'default_settings',
      updated_at: updatedAt,
    };
    const updatedSettings: Partial<SiteSettings> = {
      id: 'default_settings',
      updated_at: updatedAt,
    };

    const stringFields = [
      'phone',
      'alt_phone',
      'email',
      'address',
      'support_hours',
      'announcement_badge',
      'announcement_text',
      'about_text',
      'facebook_url',
      'instagram_url',
      'whatsapp_number',
    ] as const;

    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        if (typeof body[field] !== 'string') {
          return NextResponse.json({ error: 'অবৈধ ' + field + ' মান।' }, { status: 400 });
        }
        const value = body[field].trim();
        payload[field] = value;
        (updatedSettings as Record<string, unknown>)[field] = value;
      }
    }

    // Omitted Meta Pixel fields must remain unchanged in the database.
    if (Object.prototype.hasOwnProperty.call(body, 'meta_pixel_id')) {
      if (typeof body.meta_pixel_id !== 'string') {
        return NextResponse.json({ error: 'অবৈধ Meta Pixel ID।' }, { status: 400 });
      }
      const pixelId = body.meta_pixel_id.trim().replace(/\s+/g, '');
      if (pixelId && !/^\d{5,20}$/.test(pixelId)) {
        return NextResponse.json({ error: 'Meta Pixel ID সঠিক নয়।' }, { status: 400 });
      }
      payload.meta_pixel_id = pixelId;
      updatedSettings.meta_pixel_id = pixelId;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'meta_pixel_enabled')) {
      if (typeof body.meta_pixel_enabled !== 'boolean') {
        return NextResponse.json({ error: 'Meta Pixel Enabled মানটি true/false হতে হবে।' }, { status: 400 });
      }
      payload.meta_pixel_enabled = body.meta_pixel_enabled;
      updatedSettings.meta_pixel_enabled = body.meta_pixel_enabled;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'steadfast_enabled')) {
      if (typeof body.steadfast_enabled !== 'boolean') {
        return NextResponse.json({ error: 'অবৈধ Steadfast Enabled মান।' }, { status: 400 });
      }
      payload.steadfast_enabled = body.steadfast_enabled;
      updatedSettings.steadfast_enabled = body.steadfast_enabled;
    }

    const numericFields = [
      'delivery_charge_inside',
      'delivery_charge_outside',
      'free_delivery_threshold',
    ] as const;

    for (const field of numericFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          return NextResponse.json({ error: 'অবৈধ ' + field + ' মান।' }, { status: 400 });
        }
        payload[field] = value;
        (updatedSettings as Record<string, unknown>)[field] = value;
      }
    }

    if (Object.keys(payload).length === 2) {
      return NextResponse.json({ error: 'পরিবর্তনের জন্য কোনো সেটিংস পাওয়া যায়নি।' }, { status: 400 });
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase সংযোগ পাওয়া যাচ্ছে না।' }, { status: 503 });
    }

    const settingsColumns =
      'id, meta_pixel_id, meta_pixel_enabled, phone, alt_phone, email, address, support_hours, announcement_badge, announcement_text, about_text, facebook_url, instagram_url, whatsapp_number, steadfast_enabled, delivery_charge_inside, delivery_charge_outside, free_delivery_threshold, updated_at';

    const { data: existingSettings, error: readError } = await supabase
      .from('site_settings')
      .select(settingsColumns)
      .eq('id', 'default_settings')
      .maybeSingle();

    if (readError) {
      console.error('[Admin Settings API] Existing settings read failed:', readError.message);
      return NextResponse.json(
        { error: 'বর্তমান সেটিংস পড়া যায়নি; কোনো পরিবর্তন সংরক্ষণ করা হয়নি।' },
        { status: 500 }
      );
    }

    const completeSettings = {
      ...(existingSettings || {}),
      ...payload,
    } as SiteSettings;

    const { error } = await supabase
      .from('site_settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[Admin Settings API] Supabase upsert failed:', error.message);
      return NextResponse.json(
        { error: 'সেটিংস ডেটাবেজে সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' },
        { status: 500 }
      );
    }

    revalidateTag('site-settings');

    return NextResponse.json({
      success: true,
      settings: completeSettings,
      message: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে',
    });
  } catch (err) {
    console.error('[Admin Settings API Error]:', err);
    return NextResponse.json(
      { error: 'সেটিংস সংরক্ষণে অভ্যন্তরীণ সমস্যা দেখা দিয়েছে' },
      { status: 500 }
    );
  }
}
