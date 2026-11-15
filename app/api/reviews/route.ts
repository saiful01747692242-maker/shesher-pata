import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '../../../src/lib/serverSupabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Helper to check if an items array contains the specified bookId.
 */
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
 * GET /api/reviews?book_id=...
 * Fetch all verified reviews for a specific book.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('book_id');

    if (!bookId) {
      return NextResponse.json(
        { error: 'book_id প্যারামিটার প্রদান করা আবশ্যক' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        reviews: [],
        rating: 0,
        count: 0,
      });
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, book_id, user_name, rating, review_text, is_verified_purchase, created_at')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /api/reviews GET Error]:', error.message);
      return NextResponse.json(
        { error: 'রিভিউ লোড করতে ব্যর্থ হয়েছে' },
        { status: 500 }
      );
    }

    const count = reviews?.length || 0;
    let avgRating = 0;
    if (count > 0) {
      const sum = reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
      avgRating = Number((sum / count).toFixed(1));
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
      rating: avgRating,
      count,
    });
  } catch (err: any) {
    console.error('[API /api/reviews GET Exception]:', err);
    return NextResponse.json(
      { error: 'অভ্যন্তরীণ ত্রুটি ঘটেছে' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Submit or update a review.
 * Enforces strict server-side purchase verification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book_id, rating, review_text, user_id, user_name, user_email, user_phone } = body;

    // 1. Basic field validation
    if (!book_id || !review_text?.trim() || !rating) {
      return NextResponse.json(
        { error: 'বইয়ের আইডি, রেটিং ও রিভিউ টেক্সট আবশ্যক' },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: 'রেটিং অবশ্যই ১ থেকে ৫ এর মধ্যে হতে হবে' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'ডাটাবেজ সার্ভিস সাময়িকভাবে অনুপলব্ধ' },
        { status: 503 }
      );
    }

    // 2. Strict purchase verification
    // User must have a completed or active non-cancelled order containing this book.
    let eligibleOrder: any = null;

    // Check by user_id, customer_email, or customer_phone
    const searchConditions: string[] = [];
    if (user_id) searchConditions.push(`user_id.eq.${user_id}`);
    if (user_email?.trim()) searchConditions.push(`customer_email.eq.${user_email.trim().toLowerCase()}`);
    if (user_phone?.trim()) searchConditions.push(`customer_phone.eq.${user_phone.trim()}`);

    if (searchConditions.length === 0) {
      return NextResponse.json(
        { error: 'রিভিউ প্রদানের জন্য লগইন করা অথবা ক্রেতার পরিচিতি থাকা আবশ্যক' },
        { status: 401 }
      );
    }

    const { data: userOrders, error: orderError } = await supabase
      .from('orders')
      .select('id, items, status, customer_name, customer_email, user_id, created_at')
      .or(searchConditions.join(','))
      .neq('status', 'cancelled');

    if (orderError) {
      console.warn('[Review Order Check Error]:', orderError.message);
    }

    if (userOrders && userOrders.length > 0) {
      for (const order of userOrders) {
        if (orderContainsBook(order.items, book_id)) {
          eligibleOrder = order;
          break;
        }
      }
    }

    // If user has not purchased this book, block the review securely
    if (!eligibleOrder) {
      return NextResponse.json(
        {
          error: 'আপনি এই বইটি ক্রয় করেননি। শুধুমাত্র বইটির ভেরিফায়েড ক্রেতাগণ রিভিউ প্রদান করতে পারবেন।',
          not_purchased: true,
        },
        { status: 403 }
      );
    }

    // 3. Upsert the review in public.reviews
    const cleanUserName = (user_name || eligibleOrder.customer_name || 'সম্মানিত পাঠক').trim();
    const cleanUserEmail = (user_email || eligibleOrder.customer_email || '').trim().toLowerCase();
    const cleanUserId = user_id || eligibleOrder.user_id || `user-order-${eligibleOrder.id}`;

    const reviewPayload = {
      book_id,
      user_id: cleanUserId,
      user_name: cleanUserName,
      user_email: cleanUserEmail,
      rating: numRating,
      review_text: review_text.trim(),
      order_id: eligibleOrder.id,
      is_verified_purchase: true,
      updated_at: new Date().toISOString(),
    };

    const { data: savedReview, error: saveError } = await supabase
      .from('reviews')
      .upsert(reviewPayload, { onConflict: 'book_id,user_id' })
      .select()
      .single();

    if (saveError) {
      console.error('[API /api/reviews POST Save Error]:', saveError.message);
      return NextResponse.json(
        { error: `রিভিউ সংরক্ষণে ত্রুটি: ${saveError.message}` },
        { status: 500 }
      );
    }

    // 4. Recalculate and update book's rating and review_count in public.books
    try {
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('book_id', book_id);

      if (allReviews && allReviews.length > 0) {
        const count = allReviews.length;
        const sum = allReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
        const newAvg = Number((sum / count).toFixed(1));

        await supabase
          .from('books')
          .update({
            rating: newAvg,
            review_count: count,
            updated_at: new Date().toISOString(),
          })
          .eq('id', book_id);
      }
    } catch (updateErr) {
      console.warn('[Book Rating Update Error]:', updateErr);
    }

    return NextResponse.json({
      success: true,
      review: savedReview,
      message: 'আপনার মূল্যবান রিভিউটি সফলভাবে প্রকাশিত হয়েছে!',
    });
  } catch (err: any) {
    console.error('[API /api/reviews POST Exception]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}
