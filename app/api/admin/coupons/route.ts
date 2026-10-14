import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isRequestAuthorized } from '../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';
import { Coupon } from '../../../../src/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Fetch all coupons for admin dashboard.
 */
export async function GET(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: কুপন তালিকা দেখার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, coupons: [] });
    }

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Coupons GET Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized: Coupon[] = (data || []).map((row: any) => ({
      id: String(row.id),
      code: String(row.code).toUpperCase().trim(),
      discount_type: row.discount_type || 'percentage',
      discount_value: Number(row.discount_value || 0),
      minimum_order_amount: Number(row.minimum_order_amount || 0),
      maximum_discount_amount: row.maximum_discount_amount !== null && row.maximum_discount_amount !== undefined
        ? Number(row.maximum_discount_amount)
        : null,
      usage_limit: row.usage_limit !== null && row.usage_limit !== undefined
        ? Number(row.usage_limit)
        : null,
      used_count: Number(row.used_count || 0),
      per_user_limit: row.per_user_limit !== null && row.per_user_limit !== undefined
        ? Number(row.per_user_limit)
        : null,
      starts_at: row.starts_at || null,
      expires_at: row.expires_at || null,
      description: row.description || '',
      applicable_to: row.applicable_to || 'all',
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ success: true, coupons: normalized });
  } catch (err: any) {
    console.error('[Admin Coupons GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST / PUT: Create or update coupon.
 */
export async function POST(request: NextRequest) {
  return handleCouponSave(request);
}

export async function PUT(request: NextRequest) {
  return handleCouponSave(request);
}

async function handleCouponSave(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: কুপন পরিবর্তনের জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      id,
      code,
      discount_type,
      discount_value,
      minimum_order_amount,
      maximum_discount_amount,
      usage_limit,
      used_count,
      per_user_limit,
      starts_at,
      expires_at,
      description,
      applicable_to,
      is_active,
    } = body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'কুপন কোড প্রদান করা আবশ্যক।' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    const numDiscount = Number(discount_value);

    if (isNaN(numDiscount) || numDiscount < 1 || numDiscount > 100) {
      return NextResponse.json({ error: 'ডিসকাউন্টের শতকরা পরিমাণ ১% থেকে ১০০% এর মধ্যে হতে হবে।' }, { status: 400 });
    }

    const cleanMinOrder = minimum_order_amount !== undefined && minimum_order_amount !== '' && Number(minimum_order_amount) >= 0
      ? Number(minimum_order_amount)
      : 0;

    const cleanMaxDiscount = maximum_discount_amount !== undefined && maximum_discount_amount !== '' && Number(maximum_discount_amount) > 0
      ? Number(maximum_discount_amount)
      : null;

    const cleanUsageLimit = usage_limit !== undefined && usage_limit !== '' && Number(usage_limit) > 0
      ? Number(usage_limit)
      : null;

    const cleanPerUser = per_user_limit !== undefined && per_user_limit !== '' && Number(per_user_limit) > 0
      ? Number(per_user_limit)
      : null;

    const cleanStartsAt = starts_at ? new Date(starts_at).toISOString() : null;
    const cleanExpiresAt = expires_at ? new Date(expires_at).toISOString() : null;

    if (cleanStartsAt && cleanExpiresAt && new Date(cleanStartsAt) > new Date(cleanExpiresAt)) {
      return NextResponse.json({ error: 'মেয়াদ শেষ হওয়ার তারিখ শুরুর তারিখের পূর্ববর্তী হতে পারে না।' }, { status: 400 });
    }

    const cleanId = (id && String(id).trim()) || `coupon-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const dbPayload = {
      id: cleanId,
      code: cleanCode,
      discount_type: discount_type || 'percentage',
      discount_value: numDiscount,
      minimum_order_amount: cleanMinOrder,
      maximum_discount_amount: cleanMaxDiscount,
      usage_limit: cleanUsageLimit,
      used_count: Number(used_count || 0),
      per_user_limit: cleanPerUser,
      starts_at: cleanStartsAt,
      expires_at: cleanExpiresAt,
      description: (description || '').trim(),
      applicable_to: applicable_to || 'all',
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      updated_at: now,
    };

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'ডাটাবেজ কানেকশন পাওয়া যায়নি।' }, { status: 503 });
    }

    // Check if another coupon exists with this code (duplicate prevention)
    const { data: duplicate } = await supabase
      .from('coupons')
      .select('id, code')
      .ilike('code', cleanCode)
      .neq('id', cleanId)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { error: `"${cleanCode}" কোডটি ইতোমধ্যে বিদ্যমান। অনুগ্রহ করে অন্য কোড ব্যবহার করুন।` },
        { status: 409 }
      );
    }

    // Check if target coupon exists
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('id', cleanId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('coupons')
        .update(dbPayload)
        .eq('id', cleanId);

      if (updateError) {
        console.error('[Admin Coupons Update Error]:', updateError);
        return NextResponse.json({ error: `কুপন আপডেট ব্যর্থ: ${updateError.message}` }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('coupons')
        .insert({
          ...dbPayload,
          created_at: now,
        });

      if (insertError) {
        console.error('[Admin Coupons Insert Error]:', insertError);
        return NextResponse.json({ error: `কুপন তৈরি ব্যর্থ: ${insertError.message}` }, { status: 500 });
      }
    }

    try {
      revalidatePath('/seshadmin');
    } catch {}

    const resultCoupon: Coupon = {
      ...dbPayload,
      created_at: now,
      updated_at: now,
    };

    return NextResponse.json({
      success: true,
      coupon: resultCoupon,
      message: `কুপন "${cleanCode}" সফলভাবে সংরক্ষিত হয়েছে!`,
    });
  } catch (err: any) {
    console.error('[Admin Coupons Save Error]:', err);
    return NextResponse.json({ error: err.message || 'কুপন সংরক্ষণে সমস্যা হয়েছে' }, { status: 500 });
  }
}

/**
 * DELETE: Remove a coupon by ID.
 */
export async function DELETE(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: কুপন মুছে ফেলার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'কুপন আইডি আবশ্যক।' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  if (supabase) {
    const { error: delError } = await supabase.from('coupons').delete().eq('id', id);
    if (delError) {
      return NextResponse.json({ error: `কুপন মুছে ফেলা ব্যর্থ: ${delError.message}` }, { status: 500 });
    }
  }

  try {
    revalidatePath('/seshadmin');
  } catch {}

  return NextResponse.json({ success: true, message: 'কুপন সফলভাবে মুছে ফেলা হয়েছে।' });
}
