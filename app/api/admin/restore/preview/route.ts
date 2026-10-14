import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '../../../../../src/lib/serverAuth';
import { previewBackupArchive, MAX_COMPRESSED_SIZE_BYTES } from '../../../../../src/lib/restoreEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

/**
 * POST /api/admin/restore/preview
 * Validates the uploaded backup ZIP and returns preview statistics, conflict analysis, and preflight checks.
 */
export async function POST(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ব্যাকআপ প্রিভিউ দেখার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('backupFile') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'কোনো ব্যাকআপ ফাইল পাওয়া যায়নি।' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'শুধুমাত্র .zip ফরম্যাটের ব্যাকআপ ফাইল গ্রহণযোগ্য।' },
        { status: 400 }
      );
    }

    // Early size check before buffering
    if (file.size > MAX_COMPRESSED_SIZE_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      const limitMb = (MAX_COMPRESSED_SIZE_BYTES / 1024 / 1024).toFixed(0);
      return NextResponse.json(
        { error: `ব্যাকআপ ফাইলের আকার (${sizeMb} MB) অনুমোদিত সর্বোচ্চ সীমা (${limitMb} MB) অতিক্রম করেছে।` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await previewBackupArchive(buffer);

    return NextResponse.json({
      success: preview.valid,
      preview,
      fileName: file.name,
      fileSizeBytes: file.size,
    });
  } catch (err: any) {
    console.error('[Restore Preview API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'ব্যাকআপ ফাইলটি প্রিভিউ করতে সমস্যা হয়েছে' },
      { status: 500 }
    );
  }
}
