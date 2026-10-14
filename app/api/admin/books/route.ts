import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isRequestAuthorized } from '../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';
import { bookToRow, bookToRowPartial } from '../../../../src/services/bookService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET: Fetch books from Supabase or check connectivity.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { configured: false, error: 'Supabase credentials not configured' },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configured: true, books: data, count: data?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST: Create a new book.
 * Strictly verified: only authenticated admins can create books.
 */
export async function POST(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত অ্যাক্সেস: শুধুমাত্র অনুমোদিত অ্যাডমিন বই আপলোড করতে পারবেন।' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    if (!body || (!body.title && !body.bangla_name && !body.english_name)) {
      return NextResponse.json(
        { error: 'বইয়ের শিরোনাম প্রদান করা আবশ্যক।' },
        { status: 400 }
      );
    }

    const row = bookToRow(body);
    const supabase = getServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Supabase ডাটাবেজ কনফিগার করা হয়নি। দয়া করে .env ফাইলে ক্রেডেনশিয়াল যোগ করুন।',
          fallbackBook: body,
        },
        { status: 503 }
      );
    }

    // Insert into Supabase books table
    const { data, error } = await supabase
      .from('books')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      console.error('[Admin Books API] Supabase Insert Error:', error);
      return NextResponse.json(
        { error: `ডাটাবেজ ত্রুটি: ${error.message}`, code: error.code },
        { status: 500 }
      );
    }

    try {
      revalidatePath('/');
      revalidatePath('/api/books');
      if (data?.id) revalidatePath(`/book/${data.id}`);
      if (data?.slug) revalidatePath(`/book/${data.slug}`);
      revalidatePath('/sitemap.xml');
    } catch (e) {
      // Ignore revalidation errors
    }

    return NextResponse.json({
      success: true,
      book: data,
      message: 'বই সফলভাবে সেন্ট্রাল ডাটাবেজে সংরক্ষিত হয়েছে!',
    });
  } catch (err: any) {
    console.error('[Admin Books API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update an existing book.
 * Strictly verified: only authenticated admins can update books.
 */
export async function PUT(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত অ্যাক্সেস: শুধুমাত্র অনুমোদিত অ্যাডমিন বই সম্পাদনা করতে পারবেন।' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'বইয়ের আইডি (ID) প্রদান করা আবশ্যক' }, { status: 400 });
    }

    const body = await request.json();
    const row = bookToRowPartial(body);
    // Don't overwrite the original ID with something different
    row.id = id;
    row.updated_at = new Date().toISOString();

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase ডাটাবেজ কানেক্টেড নয়।' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from('books')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Admin Books API] Supabase Update Error:', error);
      return NextResponse.json(
        { error: `ডাটাবেজ আপডেট ত্রুটি: ${error.message}` },
        { status: 500 }
      );
    }

    try {
      revalidatePath('/');
      revalidatePath('/api/books');
      revalidatePath(`/book/${id}`);
      if (data?.slug) revalidatePath(`/book/${data.slug}`);
      revalidatePath('/sitemap.xml');
    } catch (e) {
      // Ignore revalidation errors
    }

    return NextResponse.json({
      success: true,
      book: data,
      message: 'বই সফলভাবে আপডেট করা হয়েছে!',
    });
  } catch (err: any) {
    console.error('[Admin Books API Update Error]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a book from Supabase.
 * Strictly verified: only authenticated admins can delete books.
 */
export async function DELETE(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত অ্যাক্সেস: শুধুমাত্র অনুমোদিত অ্যাডমিন বই মুছে ফেলতে পারবেন।' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'বইয়ের আইডি (ID) প্রদান করা আবশ্যক' }, { status: 400 });
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase ডাটাবেজ কানেক্টেড নয়।' },
        { status: 503 }
      );
    }

    // Optional: First get the book row to see if it has associated storage files
    const { data: existingBook } = await supabase
      .from('books')
      .select('image, cover_image')
      .eq('id', id)
      .maybeSingle();

    // Delete the database row
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Books API] Supabase Delete Error:', error);
      return NextResponse.json(
        { error: `বই মুছতে ত্রুটি: ${error.message}` },
        { status: 500 }
      );
    }

    // If image was stored in our Supabase Storage bucket, safely clean it up
    try {
      const coverUrl = existingBook?.cover_image || existingBook?.image;
      if (coverUrl && coverUrl.includes('book-covers')) {
        const parts = coverUrl.split('book-covers/');
        if (parts[1]) {
          const filePath = decodeURIComponent(parts[1].split('?')[0]);
          await supabase.storage.from('book-covers').remove([filePath]);
        }
      }
    } catch (storageErr) {
      // Non-critical cleanup failure, log only
      console.warn('[Admin Books API] Storage cleanup warning:', storageErr);
    }

    try {
      revalidatePath('/');
      revalidatePath('/api/books');
      revalidatePath(`/book/${id}`);
    } catch (e) {
      // Ignore revalidation errors
    }

    return NextResponse.json({
      success: true,
      message: 'বইটি ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে!',
    });
  } catch (err: any) {
    console.error('[Admin Books API Delete Error]:', err);
    return NextResponse.json(
      { error: err.message || 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}
