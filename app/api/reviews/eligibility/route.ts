import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function orderContainsBook(items: any, bookId: string): boolean {
  if (!items) return false;
  let parsed = items;
  if (typeof items === 'string') {
    try {
      parsed = JSON.parse(items);
    } catch {
      return false;
    }
  }
  if (!Array.isArray(parsed)) return false;

  return parsed.some((item: any) => {
    const bId = item?.book?.id || item?.book_id || item?.id;
    return String(bId).trim().toLowerCase() === String(bookId).trim().toLowerCase();
  });
}

/**
 * GET /api/reviews/eligibility?book_id=...&user_id=...&email=...&phone=...
 * Check if the user is eligible to review the book and fetch any existing review.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('book_id');
    const userId = searchParams.get('user_id');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');

    if (!bookId) {
      return NextResponse.json({ eligible: false, reason: 'missing_book_id' });
    }

    if (!userId && !email && !phone) {
      return NextResponse.json({
        eligible: false,
        reason: 'not_logged_in',
        alreadyReviewed: false,
      });
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ eligible: false, reason: 'database_unavailable' });
    }

    const searchConditions: string[] = [];
    if (userId) searchConditions.push(`user_id.eq.${userId}`);
    if (email?.trim()) searchConditions.push(`customer_email.eq.${email.trim().toLowerCase()}`);
    if (phone?.trim()) searchConditions.push(`customer_phone.eq.${phone.trim()}`);

    // 1. Check orders
    const { data: userOrders } = await supabase
      .from('orders')
      .select('id, items, status, customer_name, customer_email, user_id')
      .or(searchConditions.join(','))
      .neq('status', 'cancelled');

    let isPurchaser = false;
    let orderId: string | undefined;

    if (userOrders && userOrders.length > 0) {
      for (const order of userOrders) {
        if (orderContainsBook(order.items, bookId)) {
          isPurchaser = true;
          orderId = order.id;
          break;
        }
      }
    }

    if (!isPurchaser) {
      return NextResponse.json({
        eligible: false,
        reason: 'not_purchased',
        alreadyReviewed: false,
      });
    }

    // 2. Check if user already reviewed this book
    const reviewConditions: string[] = [];
    if (userId) reviewConditions.push(`user_id.eq.${userId}`);
    if (email?.trim()) reviewConditions.push(`user_email.eq.${email.trim().toLowerCase()}`);

    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('book_id', bookId)
      .or(reviewConditions.join(','));

    const existingReview = existingReviews && existingReviews.length > 0 ? existingReviews[0] : null;

    return NextResponse.json({
      eligible: true,
      alreadyReviewed: !!existingReview,
      existingReview,
      orderId,
    });
  } catch (err: any) {
    console.error('[API /api/reviews/eligibility Exception]:', err);
    return NextResponse.json({ eligible: false, error: err.message }, { status: 500 });
  }
}
