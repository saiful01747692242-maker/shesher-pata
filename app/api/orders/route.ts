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
    const userId = searchParams.get('user_id');
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');
    const orderId = searchParams.get('order_id');

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'ডাটাবেজ সার্ভিস অনুপলব্ধ' }, { status: 503 });
    }

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (orderId) {
      query = query.eq('id', orderId);
    } else if (!isAdmin) {
      const orConditions: string[] = [];
      if (userId) orConditions.push(`user_id.eq.${userId}`);
      if (email?.trim()) orConditions.push(`customer_email.eq.${email.trim().toLowerCase()}`);
      if (phone?.trim()) orConditions.push(`customer_phone.eq.${phone.trim()}`);

      if (orConditions.length === 0) {
        return NextResponse.json({ success: true, orders: [] });
      }
      query = query.or(orConditions.join(','));
    }

    const { data, error } = await query;
    if (error) {
      console.error('[API /api/orders GET Error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders: data || [] });
  } catch (err: any) {
    console.error('[API /api/orders GET Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
      return NextResponse.json({
        success: true,
        order: existingOrder,
        message: 'অর্ডার ইতোমধ্যে ডাটাবেজে সংরক্ষিত রয়েছে',
      });
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
      delivery_option: deliveryOption || 'inside_dhaka',
      delivery_fee: deliveryFee !== undefined && deliveryFee !== null ? Number(deliveryFee) : 60,
      payment_method: paymentMethod || 'cod',
      items: Array.isArray(items) ? items : [],
      subtotal: Number(subtotal) || 0,
      discount_amount: Number(discountAmount) || 0,
      coupon_code: couponCode || null,
      total: Number(total) || 0,
      status: 'pending',
      order_notes: orderNotes || '',
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[API /api/orders POST Error]:', error.message);
      return NextResponse.json(
        { error: `অর্ডার সংরক্ষণ ব্যর্থ: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
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
