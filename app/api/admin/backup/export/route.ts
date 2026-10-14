import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '../../../../../src/lib/serverAuth';
import { createBackupArchive, BackupCategory } from '../../../../../src/lib/backupEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Allow longer execution for complete archive bundling
export const maxDuration = 120;

/**
 * GET /api/admin/backup/export?type=[all|books|book_images|authors|categories|orders|reviews|profiles|settings|publishers|storage]
 * Generates and downloads a complete, secure ZIP backup archive.
 */
export async function GET(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ব্যাকআপ ফাইল ডাউনলোডের জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const requestedType = (url.searchParams.get('type') || 'all') as BackupCategory;

    const validTypes: BackupCategory[] = [
      'all',
      'books',
      'book_images',
      'authors',
      'categories',
      'orders',
      'reviews',
      'profiles',
      'settings',
      'publishers',
      'storage',
    ];

    const category: BackupCategory = validTypes.includes(requestedType) ? requestedType : 'all';

    const { buffer, fileName, manifest } = await createBackupArchive(category, 'seshadmin');

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Backup-Category': category,
        'X-Backup-Records': manifest.database.totalRecords.toString(),
        'X-Backup-Files': manifest.storage.totalFiles.toString(),
      },
    });
  } catch (err: any) {
    console.error('[Backup Export API Error]:', err);
    return NextResponse.json(
      {
        error: `ব্যাকআপ ফাইল তৈরি করতে ব্যর্থ হয়েছে: ${err.message || 'অভ্যন্তরীণ সার্ভার ত্রুটি'}`,
      },
      { status: 500 }
    );
  }
}
