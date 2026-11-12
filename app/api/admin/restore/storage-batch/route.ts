import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '../../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../../src/lib/serverSupabase';
import { SUPPORTED_BUCKETS } from '../../../../../src/lib/backupEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const PROHIBITED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.vbs',
  '.msi',
  '.dll',
  '.com',
  '.scr',
  '.pif',
  '.jar',
  '.jsp',
  '.php',
];

/**
 * POST /api/admin/restore/storage-batch
 * Authenticated endpoint to restore a small batch of storage files (e.g. 5-10 images).
 * Designed to bypass platform-level payload constraints (e.g., Vercel's 4.5 MB function payload limit)
 * for large backup archives containing media assets.
 */
export async function POST(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: স্টোরেজ ফাইল আপলোড করার জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const bucket = (formData.get('bucket') as string) || '';
    const pathsRaw = formData.get('paths') as string | null;

    if (!bucket || !(SUPPORTED_BUCKETS as readonly string[]).includes(bucket)) {
      return NextResponse.json(
        { error: `অননুমোদিত বা অবৈধ স্টোরেজ বাকেট: ${bucket}` },
        { status: 400 }
      );
    }

    let paths: string[] = [];
    try {
      paths = pathsRaw ? JSON.parse(pathsRaw) : [];
    } catch {
      return NextResponse.json(
        { error: 'ফাইলের পাথ তালিকাটি সঠিক JSON ফরম্যাটে নেই।' },
        { status: 400 }
      );
    }

    const files = formData.getAll('files') as File[];
    if (!files || files.length === 0 || files.length !== paths.length) {
      return NextResponse.json(
        { error: 'ফাইল এবং পাথের সংখ্যায় অমিল রয়েছে।' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'ডাটাবেজ বা স্টোরেজ সংযোগ পাওয়া যায়নি।' },
        { status: 500 }
      );
    }

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = paths[i];

      // Path traversal check
      if (
        filePath.includes('..') ||
        filePath.startsWith('/') ||
        filePath.startsWith('\\') ||
        /^[a-zA-Z]:/.test(filePath)
      ) {
        failed++;
        errors.push(`${filePath}: অবৈধ ফাইল পাথ সনাক্ত হয়েছে`);
        continue;
      }

      // Prohibited extension check
      const lowerName = filePath.toLowerCase();
      if (PROHIBITED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
        failed++;
        errors.push(`${filePath}: অননুমোদিত ক্ষতিকর ফাইল এক্সটেনশন`);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = filePath.split('.').pop()?.toLowerCase();
        let contentType = file.type || 'application/octet-stream';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'gif') contentType = 'image/gif';
        else if (ext === 'pdf') contentType = 'application/pdf';

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, buffer, {
            upsert: true,
            contentType,
          });

        if (uploadError) {
          failed++;
          errors.push(`${filePath}: ${uploadError.message}`);
        } else {
          succeeded++;
        }
      } catch (err: any) {
        failed++;
        errors.push(`${filePath}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      bucket,
      succeeded,
      failed,
      errors,
    });
  } catch (err: any) {
    console.error('[Storage Batch Upload API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'স্টোরেজ ফাইল আপলোড করতে সমস্যা হয়েছে' },
      { status: 500 }
    );
  }
}
