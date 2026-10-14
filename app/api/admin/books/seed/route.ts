import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '../../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../../src/lib/serverSupabase';
import { BOOKS } from '../../../../../src/data/books';
import { bookToRow } from '../../../../../src/services/bookService';

/**
 * POST: Seed or synchronize initial default books to Supabase.
 * Only authenticated admin can trigger seed.
 */
export async function POST(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ডাটাবেজ সিঙ্ক করার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase ডাটাবেজ কানেক্টেড নয়।' },
        { status: 503 }
      );
    }

    const rows = BOOKS.map(bookToRow);

    // Upsert in batches of 25 to respect payload limits
    const batchSize = 25;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase
        .from('books')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

      if (error) {
        console.error(`[Seed API] Error upserting batch ${i}:`, error);
        return NextResponse.json(
          { error: `সিঙ্ক করার সময় ত্রুটি হয়েছে: ${error.message}` },
          { status: 500 }
        );
      }
      insertedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      message: `${insertedCount}টি বই সফলভাবে Supabase সেন্ট্রাল ডাটাবেজে সিঙ্ক হয়েছে!`,
    });
  } catch (err: any) {
    console.error('[Seed API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}
