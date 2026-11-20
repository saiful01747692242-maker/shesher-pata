import { NextRequest, NextResponse } from 'next/server';
import { isRequestAuthorized } from '../../../../src/lib/serverAuth';
import { getServerSupabaseClient } from '../../../../src/lib/serverSupabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST: Upload image/file to Supabase Storage.
 * Strictly verified: only authenticated admins can upload files.
 */
export async function POST(request: NextRequest) {
  const authorized = isRequestAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: 'অননুমোদিত: ছবি আপলোডের জন্য অ্যাডমিন লগইন প্রয়োজন।' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optimizedFile = formData.get('optimizedFile') as File | null;
    const bucket = (formData.get('bucket') as string) || 'book-covers';
    const folder = (formData.get('folder') as string) || '';
    const recordId = (formData.get('recordId') as string) || '';
    const type = (formData.get('type') as string) || '';

    if (!file) {
      return NextResponse.json(
        { error: 'কোনো ফাইল পাওয়া যায়নি।' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase কানেকশন পাওয়া যায়নি। দয়া করে কনফিগারেশন চেক করুন।' },
        { status: 503 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename and create unique storage path
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
    const allowedDocExts = ['pdf', 'epub', 'txt'];

    if (bucket === 'book-files') {
      if (!allowedDocExts.includes(extension)) {
        return NextResponse.json(
          { error: `অননুমোদিত ফাইল ফরম্যাট। অনুমোদিত ফরম্যাট: ${allowedDocExts.join(', ')}` },
          { status: 400 }
        );
      }
    } else {
      if (!allowedImageExts.includes(extension)) {
        return NextResponse.json(
          { error: `অননুমোদিত ইমেজ ফরম্যাট। অনুমোদিত ফরম্যাট: ${allowedImageExts.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (optimizedFile && (bucket !== 'book-covers' || optimizedFile.type !== 'image/webp' || !optimizedFile.name.toLowerCase().endsWith('.webp'))) {
      return NextResponse.json(
        { error: 'অপটিমাইজড কভার ফাইলটি সঠিক WebP ফরম্যাটে নেই।' },
        { status: 400 }
      );
    }

    const uniqueId = crypto.randomUUID();
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);

    // Determine target subfolder for categories and authors (Section 5 requirement)
    let targetFolder = '';
    const cleanRecordId = recordId.replace(/[^a-zA-Z0-9_-]/g, '');

    if (type === 'category' || folder.startsWith('category')) {
      targetFolder = cleanRecordId ? `category-images/${cleanRecordId}` : 'category-images';
    } else if (type === 'author' || folder.startsWith('author')) {
      targetFolder = cleanRecordId ? `author-images/${cleanRecordId}` : 'author-images';
    } else if (folder) {
      targetFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, '');
    }

    const fileName = `${Date.now()}-${uniqueId}-${cleanBaseName || 'upload'}.${extension || 'jpg'}`;
    const filePath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

    // Keep the original file intact in Storage; use the smaller WebP for the storefront.
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Admin Upload API] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `স্টোরেজ আপলোড ব্যর্থ: ${uploadError.message}` },
        { status: 500 }
      );
    }

    let publicFilePath = filePath;
    let publicFileName = fileName;
    let optimized = false;

    if (optimizedFile && bucket === 'book-covers') {
      const optimizedBuffer = Buffer.from(await optimizedFile.arrayBuffer());
      const optimizedFileName = `${Date.now()}-${uniqueId}-${cleanBaseName || 'book-cover'}-optimized.webp`;
      const optimizedFilePath = targetFolder ? `${targetFolder}/${optimizedFileName}` : optimizedFileName;
      const { error: optimizedUploadError } = await supabase.storage
        .from(bucket)
        .upload(optimizedFilePath, optimizedBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        });

      if (optimizedUploadError) {
        console.warn('[Admin Upload API] WebP upload failed; serving original image:', optimizedUploadError.message);
      } else {
        publicFilePath = optimizedFilePath;
        publicFileName = optimizedFileName;
        optimized = true;
      }
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(publicFilePath);
    const { data: originalUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      originalUrl: originalUrlData.publicUrl,
      optimized,
      fileName: publicFileName,
      filePath: publicFilePath,
      originalFilePath: filePath,
      bucket,
    });
  } catch (err: any) {
    console.error('[Admin Upload API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'ফাইল আপলোডে অভ্যন্তরীণ ত্রুটি হয়েছে' },
      { status: 500 }
    );
  }
}
