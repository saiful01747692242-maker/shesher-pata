import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';
import { toBengaliNumber } from '../../../../src/utils/formatters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST: Server-side validation of coupon codes.
 * Ensures coupons cannot be spoofed on client-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code, subtotal } = body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { valid: false, error: 'অনুগ্রহ করে একটি কুপন কোড প্রদান করুন।' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const orderSubtotal = Number(subtotal) || 0;

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { valid: false, error: 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে।' },
        { status: 503 }
      );
    }

    // Query coupon by uppercase code
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (error || !coupon) {
      return NextResponse.json(
        { valid: false, error: 'দুঃখিত! কুপন কোডটি সঠিক নয়।' },
        { status: 404 }
      );
    }

    // 1. Check active status
    if (!coupon.is_active) {
      return NextResponse.json(
        { valid: false, error: 'দুঃখিত! এই কুপনটি বর্তমানে নিষ্ক্রিয় রয়েছে।' },
        { status: 400 }
      );
    }

    const now = new Date();

    // 2. Check start date
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return NextResponse.json(
        { valid: false, error: 'দুঃখিত! এই কুপনের মেয়াদ এখনও শুরু হয়নি।' },
        { status: 400 }
      );
    }

    // 3. Check expiration date
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return NextResponse.json(
        { valid: false, error: 'দুঃখিত! কুপনটির মেয়াদ উত্তীর্ণ হয়ে গেছে।' },
        { status: 400 }
      );
    }

    // 4. Check global usage limit
    if (
      coupon.usage_limit !== null &&
      coupon.usage_limit !== undefined &&
      Number(coupon.used_count || 0) >= Number(coupon.usage_limit)
    ) {
      return NextResponse.json(
        { valid: false, error: 'দুঃখিত! এই কুপনের ব্যবহারের সর্বোচ্চ সীমা শেষ হয়ে গেছে।' },
        { status: 400 }
      );
    }

    // 5. Check minimum order amount
    const minOrder = Number(coupon.minimum_order_amount || 0);
    if (minOrder > 0 && orderSubtotal < minOrder) {
      return NextResponse.json(
        {
          valid: false,
          error: `এই কুপনটি ব্যবহার করতে সর্বনিম্ন ৳${toBengaliNumber(minOrder)} এর বই অর্ডার করতে হবে। (বর্তমান অর্ডার: ৳${toBengaliNumber(orderSubtotal)})`,
        },
        { status: 400 }
      );
    }

    // Calculate discount amount
    const discountVal = Number(coupon.discount_value || 0);
    let calculatedDiscount = 0;

    if (coupon.discount_type === 'percentage') {
      calculatedDiscount = Math.round((orderSubtotal * discountVal) / 100);
      const maxDiscount = coupon.maximum_discount_amount !== null && coupon.maximum_discount_amount !== undefined
        ? Number(coupon.maximum_discount_amount)
        : null;

      if (maxDiscount !== null && maxDiscount > 0 && calculatedDiscount > maxDiscount) {
        calculatedDiscount = maxDiscount;
      }
    } else if (coupon.discount_type === 'fixed') {
      calculatedDiscount = Math.min(discountVal, orderSubtotal);
    } else if (coupon.discount_type === 'free_shipping') {
      calculatedDiscount = 0; // Handled in delivery fee
    }

    const message = coupon.discount_type === 'percentage'
      ? `${toBengaliNumber(discountVal)}% স্পেশাল কুপন ডিসকাউন্ট প্রয়োগ করা হয়েছে! 🎉`
      : `৳${toBengaliNumber(calculatedDiscount)} স্পেশাল কুপন ছাড় প্রয়োগ করা হয়েছে! 🎉`;

    return NextResponse.json({
      valid: true,
      message,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: discountVal,
        discount_amount: calculatedDiscount,
        minimum_order_amount: minOrder,
        maximum_discount_amount: coupon.maximum_discount_amount ? Number(coupon.maximum_discount_amount) : null,
        description: coupon.description || '',
      },
    });
  } catch (err: any) {
    console.error('[Coupon Validation API Error]:', err);
    return NextResponse.json(
      { valid: false, error: 'কুপন যাচাইয়ে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' },
      { status: 500 }
    );
  }
}
