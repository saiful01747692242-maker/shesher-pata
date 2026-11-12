import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '../../../src/lib/serverSupabase';
import { BOOKS as INITIAL_BOOKS } from '../../../src/data/books';
import { bookToRow, rowToBook } from '../../../src/services/bookService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// The catalogue is public. A short shared-cache window reduces repeated
// database reads while keeping changes visible quickly. Admin book mutations
// already call revalidatePath('/api/books').
const PUBLIC_BOOKS_CACHE = 'public, s-maxage=30, stale-while-revalidate=60';

/**
 * GET /api/books
 * Public endpoint to fetch all books from the central Supabase database.
 * Strictly read-only: never modifies, seeds, or deletes database records.
 * First-party endpoint ensures no ad-blockers block client-side requests.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      // Supabase credentials not configured, fallback to initial catalog
      return NextResponse.json({
        success: true,
        books: INITIAL_BOOKS,
        count: INITIAL_BOOKS.length,
        fallback: true,
      });
    }

    // Fetch the current catalogue. Keep all records here because the same
    // client-side store is also used by the admin interface.
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[API /api/books] Supabase fetch error:', error.message);
      return NextResponse.json({
        success: false,
        books: INITIAL_BOOKS,
        count: INITIAL_BOOKS.length,
        fallback: true,
        error: error.message,
      });
    }

    // This endpoint is read-only; short-lived shared caching avoids a fresh
    // Supabase query for every visitor without changing stored book records.
    return NextResponse.json(
      {
        success: true,
        books: data || [],
        count: (data || []).length,
      },
      {
        headers: {
          'Cache-Control': PUBLIC_BOOKS_CACHE,
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/books] Internal error:', err);
    return NextResponse.json({
      success: true,
      books: INITIAL_BOOKS,
      count: INITIAL_BOOKS.length,
      fallback: true,
    });
  }
}
