import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST: Record coupon usage upon confirmed checkout.
 * Atomically increments used_count in coupons table.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code } = body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ success: false, error: 'কুপন কোড প্রদান করুন' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false }, { status: 503 });
    }

    // Get current coupon
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, used_count')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (coupon) {
      const newCount = Number(coupon.used_count || 0) + 1;
      await supabase
        .from('coupons')
        .update({
          used_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coupon.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Coupon Apply Usage Error]:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
