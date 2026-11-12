import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '../../../../../src/lib/serverAuth';
import { executeRestore, RestoreOptions, MAX_COMPRESSED_SIZE_BYTES } from '../../../../../src/lib/restoreEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Extended timeout for executing batch restoration and storage upload
export const maxDuration = 180;

/**
 * POST /api/admin/restore/execute
 * Executes database and storage restoration from an uploaded backup ZIP archive.
 */
export async function POST(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ব্যাকআপ রিস্টোর করার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('backupFile') as File | null;
    const mode = (formData.get('mode') as 'safe' | 'full') || 'safe';
    const conflictStrategy = (formData.get('conflictStrategy') as 'overwrite' | 'skip') || 'overwrite';
    const restoreStorage = formData.get('restoreStorage') !== 'false';
    const wipeStorageBeforeImport = formData.get('wipeStorageBeforeImport') === 'true';
    const confirmationCode = (formData.get('confirmationCode') as string) || '';
    const selectedTablesRaw = formData.get('selectedTables') as string | null;

    let selectedTables: string[] | undefined = undefined;
    if (selectedTablesRaw) {
      try {
        const parsed = JSON.parse(selectedTablesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          selectedTables = parsed;
        }
      } catch {
        // Fall back to all tables
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: 'কোনো ব্যাকআপ ফাইল প্রদান করা হয়নি।' },
        { status: 400 }
      );
    }

    // Early size check before buffering
    if (file.size > MAX_COMPRESSED_SIZE_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      const limitMb = (MAX_COMPRESSED_SIZE_BYTES / 1024 / 1024).toFixed(0);
      return NextResponse.json(
        { error: `ব্যাকআপ ফাইলের আকার (${sizeMb} MB) অনুমোদিত সীমা (${limitMb} MB) অতিক্রম করেছে।` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const options: RestoreOptions = {
      mode,
      conflictStrategy,
      restoreStorage,
      wipeStorageBeforeImport,
      confirmationCode,
      selectedTables,
    };

    const report = await executeRestore(buffer, options);

    return NextResponse.json({
      success: report.success,
      report,
    });
  } catch (err: any) {
    console.error('[Restore Execute API Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: err?.message || 'রিস্টোর কার্যক্রমে সার্ভার ত্রুটি দেখা দিয়েছে' },
      { status: 500 }
    );
  }
}
