import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '../../../src/lib/serverSupabase';
import { isRequestAuthorized } from '../../../src/lib/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/orders
 * Fetch orders.
 * Admin can fetch all orders with credentials.
 * Normal users can fetch orders matching phone or email or user_id.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = isRequestAuthorized(request);
    const orderId = searchParams.get('order_id')?.trim();
    const phone = searchParams.get('phone')?.trim();

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'ডাটাবেজ সার্ভিস অনুপলব্ধ' }, { status: 503 });
    }

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (!isAdmin) {
      // Public tracking requires BOTH order ID and the phone number used at checkout.
      // Never expose orders by phone, email, or user ID alone.
      if (!orderId || !phone) {
        return NextResponse.json(
          { success: false, error: 'অর্ডার নম্বর ও অর্ডারের সময় ব্যবহৃত মোবাইল নম্বর দিন।' },
          { status: 400 }
        );
      }
      query = query.eq('id', orderId).eq('customer_phone', phone);
    } else if (orderId) {
      query = query.eq('id', orderId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[API /api/orders GET Error]:', error.message);
      return NextResponse.json({ error: 'অর্ডার খুঁজে পাওয়া যায়নি।' }, { status: 500 });
    }

    // Return only the matching record for public tracking; admin retains full order access.
    return NextResponse.json({ success: true, orders: data || [] }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (err: any) {
    console.error('[API /api/orders GET Exception]:', err);
    return NextResponse.json({ error: 'অর্ডার খুঁজতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}

/**
 * POST /api/orders
 * Create new order and save directly to Supabase PostgreSQL table.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      customerName,
      phone,
      email,
      userId,
      address,
      district,
      thana,
      postalCode,
      deliveryOption,
      deliveryFee,
      paymentMethod,
      items,
      subtotal,
      discountAmount,
      couponCode,
      total,
      orderNotes,
    } = body;

    if (
      !orderId ||
      !customerName ||
      !phone ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0 ||
      total === undefined ||
      total === null ||
      Number.isNaN(Number(total))
    ) {
      return NextResponse.json(
        { error: 'অর্ডারের আবশ্যক তথ্যসমূহ প্রদান করা হয়নি' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'ডাটাবেজ সার্ভিস অনুপলব্ধ' },
        { status: 503 }
      );
    }

    // Check if order already exists (idempotency against double submissions/retries)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (existingOrder) {
      // Idempotent retry is allowed only when the caller also proves the checkout phone.
      if (existingOrder.customer_phone === String(phone).trim()) {
        return NextResponse.json({
          success: true,
          order: existingOrder,
          message: 'অর্ডার ইতোমধ্যে ডাটাবেজে সংরক্ষিত রয়েছে',
        }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
      }
      return NextResponse.json(
        { success: false, error: 'এই অর্ডার নম্বরটি ইতোমধ্যে ব্যবহৃত হয়েছে। নতুন করে অর্ডার দিন।' },
        { status: 409, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
      );
    }

    // Recalculate every price and quantity from the live database.
    // Never trust client-submitted book prices, stock, discounts, or totals.
    const normalizedItems = items.map((item: any) => ({
      bookId: String(item?.book?.id || ''),
      quantity: Number(item?.quantity),
    }));
    if (
      normalizedItems.some((item: any) =>
        !item.bookId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50
      )
    ) {
      return NextResponse.json({ error: 'বইয়ের তথ্য বা পরিমাণ সঠিক নয়।' }, { status: 400 });
    }

    const bookIds = [...new Set(normalizedItems.map((item: any) => item.bookId))];
    if (bookIds.length !== normalizedItems.length) {
      return NextResponse.json({ error: 'একই বই একাধিকবার পাঠানো হয়েছে।' }, { status: 400 });
    }

    const { data: liveBooks, error: booksError } = await supabase
      .from('books')
      .select('id, title, title_bn, bangla_name, author, price, original_price, image, cover_image, stock, is_active, status')
      .in('id', bookIds);

    if (booksError || !liveBooks || liveBooks.length !== bookIds.length) {
      return NextResponse.json({ error: 'একটি বা একাধিক বই এখন আর অর্ডারের জন্য উপলব্ধ নেই।' }, { status: 409 });
    }

    const unavailableItem = normalizedItems.find((item: any) => {
      const book = liveBooks.find((candidate: any) => candidate.id === item.bookId);
      return !book || book.is_active === false || Number(book.stock ?? 0) < item.quantity ||
        !Number.isFinite(Number(book.price)) || Number(book.price) < 0;
    });
    if (unavailableItem) {
      return NextResponse.json(
        { error: 'একটি বা একাধিক বইয়ের স্টক বা মূল্য পরিবর্তিত হয়েছে। কার্ট আপডেট করে আবার চেষ্টা করুন।' },
        { status: 409 }
      );
    }

    const validatedItems = normalizedItems.map((item: any) => {
      const book = liveBooks.find((candidate: any) => candidate.id === item.bookId)!;
      const price = Number(book.price);
      return {
        book: {
          id: book.id,
          title: book.title_bn || book.bangla_name || book.title,
          author: book.author || '',
          price,
          originalPrice: Number(book.original_price) || price,
          image: book.image || book.cover_image || '',
          cover_image: book.cover_image || book.image || '',
        },
        quantity: item.quantity,
      };
    });

    const calculatedSubtotal = validatedItems.reduce(
      (sum: number, item: any) => sum + item.book.price * item.quantity, 0
    );

    let calculatedDiscount = 0;
    let freeShipping = false;
    if (couponCode) {
      const cleanCode = String(couponCode).trim().toUpperCase();
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('code, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, usage_limit, used_count, starts_at, expires_at, is_active')
        .ilike('code', cleanCode)
        .maybeSingle();
      const now = Date.now();
      if (couponError || !coupon || !coupon.is_active ||
          (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) ||
          (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) ||
          (coupon.usage_limit !== null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit)) ||
          calculatedSubtotal < Number(coupon.minimum_order_amount || 0)) {
        return NextResponse.json({ error: 'কুপনটি আর বৈধ নয়। অনুগ্রহ করে কুপন সরিয়ে আবার অর্ডার দিন।' }, { status: 400 });
      }
      const value = Number(coupon.discount_value || 0);
      if (coupon.discount_type === 'percentage') {
        calculatedDiscount = Math.round(calculatedSubtotal * value / 100);
        if (coupon.maximum_discount_amount !== null && Number(coupon.maximum_discount_amount) > 0) {
          calculatedDiscount = Math.min(calculatedDiscount, Number(coupon.maximum_discount_amount));
        }
      } else if (coupon.discount_type === 'fixed') {
        calculatedDiscount = Math.min(value, calculatedSubtotal);
      } else if (coupon.discount_type === 'free_shipping') {
        freeShipping = true;
      } else {
        return NextResponse.json({ error: 'কুপনের ধরন সমর্থিত নয়।' }, { status: 400 });
      }
    }

    const deliveryOptionValue = deliveryOption === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
    const { data: settings } = await supabase
      .from('site_settings')
      .select('delivery_charge_inside, delivery_charge_outside, free_delivery_threshold')
      .limit(1)
      .maybeSingle();
    const freeThreshold = Number(settings?.free_delivery_threshold ?? 1500);
    const configuredDelivery = deliveryOptionValue === 'outside_dhaka'
      ? Number(settings?.delivery_charge_outside ?? 120)
      : Number(settings?.delivery_charge_inside ?? 60);
    const calculatedDeliveryFee = freeShipping || (freeThreshold > 0 && calculatedSubtotal >= freeThreshold)
      ? 0
      : Math.max(0, configuredDelivery);
    const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscount + calculatedDeliveryFee);

    const suppliedSubtotal = Number(subtotal);
    const suppliedDiscount = Number(discountAmount || 0);
    const suppliedDelivery = Number(deliveryFee);
    const suppliedTotal = Number(total);
    if (
      !Number.isFinite(suppliedSubtotal) || Math.abs(suppliedSubtotal - calculatedSubtotal) > 0.01 ||
      !Number.isFinite(suppliedDiscount) || Math.abs(suppliedDiscount - calculatedDiscount) > 0.01 ||
      !Number.isFinite(suppliedDelivery) || Math.abs(suppliedDelivery - calculatedDeliveryFee) > 0.01 ||
      !Number.isFinite(suppliedTotal) || Math.abs(suppliedTotal - calculatedTotal) > 0.01
    ) {
      return NextResponse.json(
        { error: 'অর্ডারের মূল্য বা ডেলিভারি চার্জ পরিবর্তিত হয়েছে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।' },
        { status: 409 }
      );
    }

    const row = {
      id: orderId,
      customer_name: customerName.trim(),
      customer_phone: phone.trim(),
      customer_email: (email || '').trim().toLowerCase(),
      user_id: userId || null,
      address: address.trim(),
      district: district || 'ঢাকা',
      thana: thana || '',
      postal_code: postalCode || '',
      delivery_option: deliveryOptionValue,
      delivery_fee: calculatedDeliveryFee,
      payment_method: paymentMethod || 'cod',
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount_amount: calculatedDiscount,
      coupon_code: couponCode || null,
      total: calculatedTotal,
      status: 'pending',
      order_notes: orderNotes || '',
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Anonymous clients are allowed to INSERT orders by RLS, but cannot SELECT
    // them. Avoid RETURNING (.select()) here so the insert does not require
    // a separate SELECT policy for the newly created row.
    const { error } = await supabase
      .from('orders')
      .insert(row);

    if (error) {
      console.error('[API /api/orders POST Error]:', error.message);
      return NextResponse.json(
        { error: `অর্ডার সংরক্ষণ ব্যর্থ: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: row,
      message: 'অর্ডার সফলভাবে ডাটাবেজে সংরক্ষিত হয়েছে',
    });
  } catch (err: any) {
    console.error('[API /api/orders POST Exception]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders
 * Update order details or status (Admin only).
 */
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = isRequestAuthorized(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'অননুমোদিত অ্যাক্সেস: শুধুমাত্র অনুমোদিত অ্যাডমিন এই সুবিধা ব্যবহার করতে পারবেন।' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const orderId = body.orderId || body.id;

    if (!orderId) {
      return NextResponse.json(
        { error: 'অর্ডার আইডি আবশ্যক' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'ডাটাবেজ সার্ভিস অনুপলব্ধ' },
        { status: 503 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updates.status = String(body.status);
    if (body.deliveryFee !== undefined) updates.delivery_fee = Number(body.deliveryFee);
    if (body.total !== undefined) updates.total = Number(body.total);
    if (body.orderNotes !== undefined) updates.order_notes = String(body.orderNotes);
    if (body.steadfast_consignment_id !== undefined) updates.steadfast_consignment_id = String(body.steadfast_consignment_id);
    if (body.steadfast_tracking_code !== undefined) updates.steadfast_tracking_code = String(body.steadfast_tracking_code);
    if (body.steadfast_status !== undefined) updates.steadfast_status = String(body.steadfast_status);

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[API /api/orders PUT Error]:', error.message);
      return NextResponse.json(
        { error: `অর্ডার আপডেট ব্যর্থ: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
      message: 'অর্ডার সফলভাবে আপডেট হয়েছে',
    });
  } catch (err: any) {
    console.error('[API /api/orders PUT Exception]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders
 * Delete order from database (Admin only).
 */
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = isRequestAuthorized(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'অননুমোদিত অ্যাক্সেস: শুধুমাত্র অনুমোদিত অ্যাডমিন এই সুবিধা ব্যবহার করতে পারবেন।' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const orderId = searchParams.get('order_id') || searchParams.get('id') || body?.orderId || body?.id;

    if (!orderId) {
      return NextResponse.json(
        { error: 'অর্ডার আইডি আবশ্যক' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'ডাটাবেজ সার্ভিস অনুপলব্ধ' },
        { status: 503 }
      );
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('[API /api/orders DELETE Error]:', error.message);
      return NextResponse.json(
        { error: `অর্ডার মুছে ফেলা ব্যর্থ: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'অর্ডার সফলভাবে মুছে ফেলা হয়েছে',
    });
  } catch (err: any) {
    console.error('[API /api/orders DELETE Exception]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}
