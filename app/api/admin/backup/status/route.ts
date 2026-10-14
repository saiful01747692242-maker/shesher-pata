import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '../../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../../src/lib/serverSupabase';
import { SUPPORTED_TABLES, SUPPORTED_BUCKETS, listAllStorageFiles } from '../../../../../src/lib/backupEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/backup/status
 * Returns current counts for all database tables, storage buckets, and last backup stats.
 */
export async function GET(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ব্যাকআপ স্ট্যাটাস দেখার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'ডাটাবেজ কানেকশন নিশ্চিত করা যায়নি।' },
        { status: 503 }
      );
    }

    const tableCounts: Record<string, number> = {};
    for (const table of SUPPORTED_TABLES) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        tableCounts[table] = error ? 0 : count || 0;
      } catch {
        tableCounts[table] = 0;
      }
    }

    const storageCounts: Record<string, { count: number; totalSizeBytes: number }> = {};
    for (const bucket of SUPPORTED_BUCKETS) {
      try {
        const files = await listAllStorageFiles(bucket, '', supabase);
        const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
        storageCounts[bucket] = {
          count: files.length,
          totalSizeBytes: totalSize,
        };
      } catch {
        storageCounts[bucket] = { count: 0, totalSizeBytes: 0 };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        tables: tableCounts,
        totalRecords: Object.values(tableCounts).reduce((a, b) => a + b, 0),
      },
      storage: {
        buckets: storageCounts,
        totalFiles: Object.values(storageCounts).reduce((a, b) => a + b.count, 0),
        totalSizeBytes: Object.values(storageCounts).reduce((a, b) => a + b.totalSizeBytes, 0),
      },
    });
  } catch (err: any) {
    console.error('[Backup Status API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'স্ট্যাটাস লোড করতে সমস্যা হয়েছে' },
      { status: 500 }
    );
  }
}
