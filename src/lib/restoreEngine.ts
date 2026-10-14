import 'server-only';
import crypto from 'crypto';
import JSZip from 'jszip';
import { getServerSupabaseClient } from './serverSupabase';
import {
  BackupManifest,
  SUPPORTED_TABLES,
  SUPPORTED_BUCKETS,
  calculateSha256,
  fetchAllRowsFromTable,
} from './backupEngine';

if (typeof window !== 'undefined') {
  throw new Error('SECURITY VIOLATION: restoreEngine can only be executed on the server.');
}

// Security Configuration Limits
export const MAX_COMPRESSED_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB max uploaded ZIP
export const MAX_UNCOMPRESSED_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB max uncompressed
export const MAX_ARCHIVE_ENTRY_COUNT = 5000; // max 5,000 files/folders in zip
export const MAX_COMPRESSION_RATIO = 100; // anti zip-bomb threshold: 100:1 ratio

export interface RestoreOptions {
  mode: 'safe' | 'full';
  conflictStrategy?: 'overwrite' | 'skip';
  selectedTables?: string[];
  restoreStorage?: boolean;
  wipeStorageBeforeImport?: boolean; // explicit opt-in for full storage wipe
  confirmationCode?: string;
}

export interface TableConflictReport {
  tableName: string;
  totalInBackup: number;
  existingInDb: number;
  newRecords: number;
  sampleExistingIds: string[];
}

export interface PreflightCheckResult {
  passed: boolean;
  databaseCompatible: boolean;
  schemaCompatible: boolean;
  missingTables: string[];
  verifiedTables: string[];
  storageCompatible: boolean;
  missingBuckets: string[];
  createdBuckets: string[];
  foreignKeyIssues: string[];
  checksumMismatches: string[];
  actionableErrors: string[];
  warnings: string[];
}

export interface RestorePreviewResult {
  valid: boolean;
  manifest: BackupManifest | null;
  validationErrors: string[];
  warnings: string[];
  conflicts: TableConflictReport[];
  preflight: PreflightCheckResult;
  storageFilesCount: number;
  totalRecordsCount: number;
  checksumStatus: 'verified' | 'mismatched' | 'skipped';
}

export interface TableRestoreResult {
  tableName: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface StorageRestoreResult {
  bucket: string;
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export interface SkippedProfileReport {
  id: string;
  name?: string;
  email?: string;
  reason: string;
}

export interface FullRestoreExecutionReport {
  success: boolean;
  mode: 'safe' | 'full';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  isAtomic: false; // Explicitly document non-atomic nature of multi-batch HTTP restore
  preRestoreSnapshot?: {
    timestamp: string;
    recordCounts: Record<string, number>;
  };
  database: {
    totalRecords: number;
    succeeded: number;
    failed: number;
    skipped: number;
    tables: Record<string, TableRestoreResult>;
  };
  storage: {
    totalFiles: number;
    succeeded: number;
    failed: number;
    buckets: Record<string, StorageRestoreResult>;
  };
  skippedProfiles: SkippedProfileReport[];
  summaryMessage: string;
  errors: string[];
  warnings: string[];
}

// Order of restoration to satisfy Foreign Key constraints
export const RESTORE_DEPENDENCY_ORDER = [
  'site_settings',
  'categories',
  'authors',
  'publishers',
  'banners',
  'coupons',
  'profiles',
  'books',
  'orders',
  'reviews',
  'steadfast_config',
] as const;

// Prohibited dangerous file extensions
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
 * Validates the uploaded archive against security threats:
 * - Buffer size limit before parsing
 * - ZIP magic header verification
 * - Entry count limit
 * - Path traversal (directory breakout)
 * - Prohibited executables
 * - Decompression bomb / compression ratio check
 */
export async function inspectAndSanitizeZip(zipBuffer: Buffer): Promise<{
  zip: JSZip;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Buffer existence and minimum size
  if (!zipBuffer || zipBuffer.length === 0) {
    errors.push('আপলোডকৃত ব্যাকআপ ফাইলটি খালি (Empty file).');
    return { zip: new JSZip(), errors, warnings };
  }

  // 2. Compressed size limit check before parsing
  if (zipBuffer.length > MAX_COMPRESSED_SIZE_BYTES) {
    const sizeMb = (zipBuffer.length / 1024 / 1024).toFixed(1);
    const limitMb = (MAX_COMPRESSED_SIZE_BYTES / 1024 / 1024).toFixed(0);
    errors.push(
      `ব্যাকআপ ফাইলের আকার (${sizeMb} MB) অনুমোদিত সর্বোচ্চ সীমা (${limitMb} MB) অতিক্রম করেছে।`
    );
    return { zip: new JSZip(), errors, warnings };
  }

  // 3. ZIP magic header validation (PK\x03\x04 or PK\x05\x06)
  const isZipMagic =
    zipBuffer.length >= 4 &&
    zipBuffer[0] === 0x50 && // 'P'
    zipBuffer[1] === 0x4b && // 'K'
    (zipBuffer[2] === 0x03 || zipBuffer[2] === 0x05 || zipBuffer[2] === 0x07);

  if (!isZipMagic) {
    errors.push('ফাইলটি বৈধ ZIP ফরম্যাটে নেই বা ক্ষতিগ্রস্ত (Invalid ZIP header signature).');
    return { zip: new JSZip(), errors, warnings };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch (err: any) {
    errors.push(`আর্কাইভ ফাইলটি পড়া সম্ভব হয়নি: ${err.message || 'Corrupted archive'}`);
    return { zip: new JSZip(), errors, warnings };
  }

  // 4. Archive Entry Count Limit Check
  const entries = Object.keys(zip.files);
  if (entries.length > MAX_ARCHIVE_ENTRY_COUNT) {
    errors.push(
      `আর্কাইভে ফাইলের সংখ্যা (${entries.length}) অনুমোদিত সর্বোচ্চ সীমা (${MAX_ARCHIVE_ENTRY_COUNT}) অতিক্রম করেছে।`
    );
    return { zip, errors, warnings };
  }

  // 5. Entry Path & Security Checks
  let totalUncompressedSize = 0;

  for (const relativePath of entries) {
    const entry = zip.files[relativePath];

    // Path traversal check
    if (
      relativePath.includes('..') ||
      relativePath.startsWith('/') ||
      relativePath.startsWith('\\') ||
      /^[a-zA-Z]:/.test(relativePath)
    ) {
      errors.push(`নিরাপত্তা সতর্কতা: বেআইনি ফাইল পাথ সনাক্ত হয়েছে (${relativePath})`);
      break;
    }

    // Dangerous executable check
    const lowerName = relativePath.toLowerCase();
    for (const ext of PROHIBITED_EXTENSIONS) {
      if (lowerName.endsWith(ext)) {
        errors.push(`নিরাপত্তা ঝুঁকি: ক্ষতিকর বা অননুমোদিত এক্সিকিউটেবল ফাইল পাওয়া গেছে (${relativePath})`);
        break;
      }
    }

    // Calculate uncompressed size
    const uncompressedSize = (entry as any)._data?.uncompressedSize || 0;
    totalUncompressedSize += uncompressedSize;

    if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE_BYTES) {
      errors.push(
        `নিরাপত্তা সতর্কতা: ব্যাকআপ ফাইলের মোট আনকম্প্রেসড আকার (${(totalUncompressedSize / 1024 / 1024).toFixed(0)} MB) অনুমোদিত সীমা (${(MAX_UNCOMPRESSED_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB) অতিক্রম করেছে।`
      );
      break;
    }
  }

  // 6. Suspicious Compression Ratio Check (Anti-Zip Bomb)
  if (zipBuffer.length > 0 && totalUncompressedSize > 0) {
    const ratio = totalUncompressedSize / zipBuffer.length;
    if (ratio > MAX_COMPRESSION_RATIO) {
      errors.push(
        `সন্দেহজনক কম্প্রেশন রেশিও (${ratio.toFixed(0)}:1) সনাক্ত হয়েছে (সম্ভাব্য Decompression Bomb ঝুঁকি)।`
      );
    }
  }

  return { zip, errors, warnings };
}

/**
 * Preflight Engine: Validates target Supabase database schema compatibility,
 * storage bucket availability, and relational integrity before any write occurs.
 */
export async function runRestorationPreflight(
  zip: JSZip,
  manifest: BackupManifest | null,
  supabase = getServerSupabaseClient()
): Promise<PreflightCheckResult> {
  const result: PreflightCheckResult = {
    passed: true,
    databaseCompatible: true,
    schemaCompatible: true,
    missingTables: [],
    verifiedTables: [],
    storageCompatible: true,
    missingBuckets: [],
    createdBuckets: [],
    foreignKeyIssues: [],
    checksumMismatches: [],
    actionableErrors: [],
    warnings: [],
  };

  if (!supabase) {
    result.passed = false;
    result.actionableErrors.push('টার্গেট Supabase ডাটাবেজ কানেকশন নিশ্চিত করা যায়নি।');
    return result;
  }

  // 1. Verify Target Database Tables Exist
  for (const tableName of SUPPORTED_TABLES) {
    const file = zip.file(`data/${tableName}.json`);
    if (!file) continue;

    try {
      const { error } = await supabase.from(tableName).select('id').limit(0);
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('not find') || error.message?.includes('does not exist')) {
          result.missingTables.push(tableName);
          result.actionableErrors.push(
            `টার্গেট ডাটাবেজে টেবিল "${tableName}" পাওয়া যায়নি। অনুগ্রহ করে schema.sql রান করে স্কিমা তৈরি করুন।`
          );
        } else {
          result.warnings.push(`টেবিল "${tableName}" যাচাইয়ের সময় সতর্কতা: ${error.message}`);
        }
      } else {
        result.verifiedTables.push(tableName);
      }
    } catch (err: any) {
      result.missingTables.push(tableName);
      result.actionableErrors.push(`টেবিল "${tableName}" যাচাই ব্যর্থ: ${err.message}`);
    }
  }

  if (result.missingTables.length > 0) {
    result.databaseCompatible = false;
    result.schemaCompatible = false;
    result.passed = false;
  }

  // 2. Verify and Auto-Provision Storage Buckets
  try {
    const { data: existingBuckets, error: bErr } = await supabase.storage.listBuckets();
    const existingBucketIds = new Set((existingBuckets || []).map((b) => b.id));

    for (const bName of SUPPORTED_BUCKETS) {
      // Check if this bucket has files in the archive
      let hasFiles = false;
      for (const p of Object.keys(zip.files)) {
        if (p.startsWith(`storage/${bName}/`) && !zip.files[p].dir) {
          hasFiles = true;
          break;
        }
      }

      if (hasFiles && !existingBucketIds.has(bName)) {
        result.missingBuckets.push(bName);
        // Attempt safe bucket creation
        const isPublic = bName !== 'book-files';
        try {
          const { error: createErr } = await supabase.storage.createBucket(bName, {
            public: isPublic,
          });
          if (createErr) {
            result.actionableErrors.push(
              `স্টোরেজ বাকেট "${bName}" তৈরি করা সম্ভব হয়নি: ${createErr.message}। Supabase Dashboard থেকে ম্যানুয়ালি তৈরি করুন।`
            );
          } else {
            result.createdBuckets.push(bName);
            result.warnings.push(`স্টোরেজ বাকেট "${bName}" অনুপস্থিত ছিল, স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে।`);
          }
        } catch (ex: any) {
          result.actionableErrors.push(`স্টোরেজ বাকেট "${bName}" প্রভিশনিং ত্রুটি: ${ex.message}`);
        }
      }
    }
  } catch (bucketEx: any) {
    result.warnings.push(`স্টোরেজ বাকেট প্রিফ্লাইট চেক সীমিত: ${bucketEx.message}`);
  }

  if (result.actionableErrors.length > 0) {
    result.passed = false;
  }

  // 3. Relational Foreign Key Integrity Check (Reviews -> Books)
  const reviewsFile = zip.file('data/reviews.json');
  const booksFile = zip.file('data/books.json');

  if (reviewsFile) {
    try {
      const reviewsData = JSON.parse(await reviewsFile.async('string'));
      let knownBookIds = new Set<string>();

      if (booksFile) {
        const booksData = JSON.parse(await booksFile.async('string'));
        if (Array.isArray(booksData)) {
          knownBookIds = new Set(booksData.map((b: any) => String(b.id)));
        }
      }

      let orphanedCount = 0;
      if (Array.isArray(reviewsData)) {
        for (const rev of reviewsData) {
          if (rev.book_id && !knownBookIds.has(String(rev.book_id))) {
            orphanedCount++;
          }
        }
      }

      if (orphanedCount > 0) {
        result.foreignKeyIssues.push(
          `রিভিউ টেবিলে ${orphanedCount} টি রিভিউ পাওয়া গেছে যার সংশ্লিষ্ট বই ব্যাকআপে বা ডাটাবেজে অনুপস্থিত।`
        );
        result.warnings.push(
          `ফরেন-কী ডিপেন্ডেন্সি: ${orphanedCount} টি রিভিউ সংশ্লিষ্ট বইয়ের অনুপস্থিতির কারণে স্কিপ হতে পারে।`
        );
      }
    } catch {
      // Ignore json parse error here; will be caught in preview
    }
  }

  // 4. Checksum Verification against Manifest
  if (manifest?.database?.tables) {
    for (const [tName, meta] of Object.entries(manifest.database.tables)) {
      const f = zip.file(`data/${meta.fileName}`);
      if (f) {
        const content = await f.async('nodebuffer');
        const calculated = calculateSha256(content.toString('utf8'));
        if (calculated !== meta.sha256) {
          result.checksumMismatches.push(tName);
          result.actionableErrors.push(`টেবিল "${tName}"-এর ডেটা চেকসাম মিলছে না (Corrupted content).`);
          result.passed = false;
        }
      }
    }
  }

  return result;
}

/**
 * Previews the backup archive contents, runs conflict analysis, and performs preflight validation.
 */
export async function previewBackupArchive(
  zipBuffer: Buffer,
  supabase = getServerSupabaseClient()
): Promise<RestorePreviewResult> {
  const { zip, errors, warnings } = await inspectAndSanitizeZip(zipBuffer);

  const fallbackPreflight: PreflightCheckResult = {
    passed: false,
    databaseCompatible: false,
    schemaCompatible: false,
    missingTables: [],
    verifiedTables: [],
    storageCompatible: false,
    missingBuckets: [],
    createdBuckets: [],
    foreignKeyIssues: [],
    checksumMismatches: [],
    actionableErrors: errors,
    warnings,
  };

  if (errors.length > 0) {
    return {
      valid: false,
      manifest: null,
      validationErrors: errors,
      warnings,
      conflicts: [],
      preflight: fallbackPreflight,
      storageFilesCount: 0,
      totalRecordsCount: 0,
      checksumStatus: 'mismatched',
    };
  }

  // Parse manifest.json
  const manifestFile = zip.file('manifest.json');
  let manifest: BackupManifest | null = null;

  if (manifestFile) {
    try {
      const manifestStr = await manifestFile.async('string');
      manifest = JSON.parse(manifestStr);
    } catch (e: any) {
      warnings.push(`manifest.json পড়া সম্ভব হয়নি: ${e.message}`);
    }
  } else {
    warnings.push('আর্কাইভে কোনো manifest.json পাওয়া যায়নি। পুরোনো বা ম্যানুয়াল ব্যাকআপ হিসেবে স্ক্যান করা হচ্ছে।');
  }

  // Run comprehensive Preflight Checks
  const preflight = await runRestorationPreflight(zip, manifest, supabase);

  // Check file checksum status
  let checksumStatus: 'verified' | 'mismatched' | 'skipped' = manifest ? 'verified' : 'skipped';
  if (preflight.checksumMismatches.length > 0) {
    checksumStatus = 'mismatched';
  }

  // Count storage files in ZIP
  let storageFilesCount = 0;
  for (const path of Object.keys(zip.files)) {
    if (path.startsWith('storage/') && !zip.files[path].dir) {
      storageFilesCount += 1;
    }
  }

  // Scan database tables and perform conflict analysis against live DB
  const conflicts: TableConflictReport[] = [];
  let totalRecordsCount = 0;

  for (const tableName of SUPPORTED_TABLES) {
    const file = zip.file(`data/${tableName}.json`);
    if (!file) continue;

    try {
      const content = await file.async('string');
      const rows: any[] = JSON.parse(content);
      if (!Array.isArray(rows)) continue;

      totalRecordsCount += rows.length;

      const backupIds = rows
        .map((r) => r.id)
        .filter((id) => id !== undefined && id !== null && id !== '');

      let existingInDb = 0;
      const sampleExistingIds: string[] = [];

      if (supabase && backupIds.length > 0) {
        // Query database in chunks of 100 to check existing IDs
        for (let i = 0; i < backupIds.length; i += 100) {
          const chunk = backupIds.slice(i, i + 100);
          const { data, error } = await supabase
            .from(tableName)
            .select('id')
            .in('id', chunk);

          if (!error && data) {
            existingInDb += data.length;
            if (sampleExistingIds.length < 5) {
              sampleExistingIds.push(...data.map((d: any) => String(d.id)).slice(0, 5 - sampleExistingIds.length));
            }
          }
        }
      }

      conflicts.push({
        tableName,
        totalInBackup: rows.length,
        existingInDb,
        newRecords: rows.length - existingInDb,
        sampleExistingIds,
      });
    } catch (err: any) {
      warnings.push(`টেবিল ${tableName}.json প্রসেসিং ত্রুটি: ${err.message}`);
    }
  }

  const isValid = errors.length === 0 && preflight.actionableErrors.length === 0;

  return {
    valid: isValid,
    manifest,
    validationErrors: [...errors, ...preflight.actionableErrors],
    warnings: [...warnings, ...preflight.warnings],
    conflicts,
    preflight,
    storageFilesCount,
    totalRecordsCount,
    checksumStatus,
  };
}

/**
 * Splits an array into equal sized chunks.
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Executes the complete restoration process according to chosen mode and options.
 */
export async function executeRestore(
  zipBuffer: Buffer,
  options: RestoreOptions,
  supabase = getServerSupabaseClient()
): Promise<FullRestoreExecutionReport> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const report: FullRestoreExecutionReport = {
    success: false,
    mode: options.mode,
    startedAt,
    finishedAt: '',
    durationMs: 0,
    isAtomic: false, // Transparent documentation: multi-batch HTTP operations are not a single atomic transaction
    database: {
      totalRecords: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      tables: {},
    },
    storage: {
      totalFiles: 0,
      succeeded: 0,
      failed: 0,
      buckets: {},
    },
    skippedProfiles: [],
    summaryMessage: '',
    errors: [],
    warnings: [],
  };

  if (!supabase) {
    report.errors.push('ডাটাবেজ কানেকশন নিশ্চিত করা যায়নি।');
    report.finishedAt = new Date().toISOString();
    return report;
  }

  // 1. Safety confirmation validation for Full Replacement mode
  if (options.mode === 'full') {
    if (options.confirmationCode !== 'CONFIRM_FULL_RESTORE') {
      report.errors.push('নিরাপত্তা ত্রুটি: ফুল রিপ্লেসমেন্ট মোডের জন্য সঠিক কনফার্মেশন কোড (CONFIRM_FULL_RESTORE) প্রদান করা আবশ্যক।');
      report.finishedAt = new Date().toISOString();
      return report;
    }
  }

  // 2. Validate Archive Structure & Security Constraints
  const { zip, errors: zipErrors, warnings: zipWarnings } = await inspectAndSanitizeZip(zipBuffer);
  report.warnings.push(...zipWarnings);

  if (zipErrors.length > 0) {
    report.errors.push(...zipErrors);
    report.finishedAt = new Date().toISOString();
    return report;
  }

  // 3. Parse manifest for preflight
  const manifestFile = zip.file('manifest.json');
  let manifest: BackupManifest | null = null;
  if (manifestFile) {
    try {
      manifest = JSON.parse(await manifestFile.async('string'));
    } catch {}
  }

  // 4. Run Preflight Checks before any write or delete
  const preflight = await runRestorationPreflight(zip, manifest, supabase);
  report.warnings.push(...preflight.warnings);

  if (!preflight.passed || preflight.actionableErrors.length > 0) {
    report.errors.push(...preflight.actionableErrors);
    report.finishedAt = new Date().toISOString();
    report.summaryMessage = 'প্রিফ্লাইট যাচাইকরণ ব্যর্থ হয়েছে। ডাটাবেজে কোনো পরিবর্তন করা হয়নি।';
    return report;
  }

  // 5. Pre-Restore Safety Snapshot (Full Replacement Mode only)
  if (options.mode === 'full') {
    try {
      const snapshotCounts: Record<string, number> = {};
      for (const t of SUPPORTED_TABLES) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        snapshotCounts[t] = count || 0;
      }
      report.preRestoreSnapshot = {
        timestamp: new Date().toISOString(),
        recordCounts: snapshotCounts,
      };
    } catch (snapErr: any) {
      report.warnings.push(`প্রি-রিস্টোর সেফটি স্ন্যাপশট সংগ্রহ সীমিত: ${snapErr.message}`);
    }
  }

  // ============================================================================
  // STAGE 1: RESTORE STORAGE FILES FIRST (so DB cover image references work)
  // ============================================================================
  if (options.restoreStorage !== false) {
    const storageFiles: Array<{ bucket: string; filePath: string; zipPath: string }> = [];

    for (const zipPath of Object.keys(zip.files)) {
      if (zipPath.startsWith('storage/') && !zip.files[zipPath].dir) {
        const parts = zipPath.replace('storage/', '').split('/');
        const bucket = parts[0];
        const filePath = parts.slice(1).join('/');
        if (bucket && filePath) {
          storageFiles.push({ bucket, filePath, zipPath });
        }
      }
    }

    // Initialize buckets in report
    for (const item of storageFiles) {
      if (!report.storage.buckets[item.bucket]) {
        report.storage.buckets[item.bucket] = {
          bucket: item.bucket,
          total: 0,
          succeeded: 0,
          failed: 0,
          errors: [],
        };
      }
      report.storage.buckets[item.bucket].total += 1;
      report.storage.totalFiles += 1;
    }

    // If wipeStorageBeforeImport is explicitly requested, list and remove target bucket files
    if (options.mode === 'full' && options.wipeStorageBeforeImport === true) {
      for (const bucketName of Object.keys(report.storage.buckets)) {
        try {
          const { data: existingFiles } = await supabase.storage.from(bucketName).list('', { limit: 1000 });
          if (existingFiles && existingFiles.length > 0) {
            const filesToRemove = existingFiles.map((f) => f.name);
            await supabase.storage.from(bucketName).remove(filesToRemove);
          }
        } catch (wipeErr: any) {
          report.warnings.push(`বাকেট ${bucketName} ওয়াইপ ত্রুটি: ${wipeErr.message}`);
        }
      }
    }

    // Process storage uploads in concurrent batches of 10
    const concurrency = 10;
    for (let i = 0; i < storageFiles.length; i += concurrency) {
      const batch = storageFiles.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (item) => {
          try {
            const fileData = await zip.files[item.zipPath].async('nodebuffer');
            const ext = item.filePath.split('.').pop()?.toLowerCase();
            let contentType = 'application/octet-stream';
            if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
            else if (ext === 'png') contentType = 'image/png';
            else if (ext === 'webp') contentType = 'image/webp';
            else if (ext === 'gif') contentType = 'image/gif';
            else if (ext === 'pdf') contentType = 'application/pdf';

            const { error: uploadError } = await supabase.storage
              .from(item.bucket)
              .upload(item.filePath, fileData, {
                upsert: true,
                contentType,
              });

            if (uploadError) {
              report.storage.buckets[item.bucket].failed += 1;
              report.storage.failed += 1;
              report.storage.buckets[item.bucket].errors.push(`${item.filePath}: ${uploadError.message}`);
            } else {
              report.storage.buckets[item.bucket].succeeded += 1;
              report.storage.succeeded += 1;
            }
          } catch (uploadEx: any) {
            report.storage.buckets[item.bucket].failed += 1;
            report.storage.failed += 1;
            report.storage.buckets[item.bucket].errors.push(`${item.filePath}: ${uploadEx.message}`);
          }
        })
      );
    }
  }

  // ============================================================================
  // STAGE 2: IN FULL REPLACEMENT MODE, CLEAR EXISTING DATA IN REVERSE ORDER
  // ============================================================================
  if (options.mode === 'full') {
    const reverseOrder = [...RESTORE_DEPENDENCY_ORDER].reverse();
    for (const table of reverseOrder) {
      if (!options.selectedTables || options.selectedTables.includes(table)) {
        try {
          if (table === 'site_settings') {
            // Do not delete site_settings, default row will be overwritten by upsert
            continue;
          }
          // Delete records safely
          const { error: delError } = await supabase.from(table).delete().neq('id', '___NEVER_MATCH___');
          if (delError) {
            console.warn(`[RestoreEngine] Warning clearing table ${table}:`, delError.message);
          }
        } catch (err: any) {
          console.warn(`[RestoreEngine] Error deleting from ${table}:`, err.message);
        }
      }
    }
  }

  // ============================================================================
  // STAGE 3: RESTORE DATABASE TABLES IN STRICT DEPENDENCY ORDER
  // ============================================================================
  for (const tableName of RESTORE_DEPENDENCY_ORDER) {
    if (options.selectedTables && !options.selectedTables.includes(tableName)) {
      continue;
    }

    const file = zip.file(`data/${tableName}.json`);
    if (!file) {
      continue;
    }

    report.database.tables[tableName] = {
      tableName,
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const content = await file.async('string');
      const rows: any[] = JSON.parse(content);
      if (!Array.isArray(rows) || rows.length === 0) {
        continue;
      }

      report.database.tables[tableName].total = rows.length;
      report.database.totalRecords += rows.length;

      // Handle user profiles referential integrity:
      // Never invent fake identities. If user doesn't exist in auth.users, skip with explicit report.
      let validRows = rows;
      if (tableName === 'profiles') {
        const verifiedProfiles: any[] = [];
        for (const prof of rows) {
          if (!prof.id) continue;

          let authUserFound = false;
          try {
            const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(prof.id);
            if (userData?.user && !userErr) {
              authUserFound = true;
            }
          } catch {
            authUserFound = false;
          }

          if (authUserFound) {
            verifiedProfiles.push(prof);
          } else {
            // DO NOT create placeholder accounts; explicitly report skipped profile
            report.skippedProfiles.push({
              id: prof.id,
              name: prof.name || '',
              email: prof.email || '',
              reason: 'Supabase auth.users-এ অনুপস্থিত (Authentic identity missing)',
            });
            report.database.tables[tableName].skipped += 1;
            report.database.skipped += 1;
            report.database.tables[tableName].errors.push(
              `প্রোফাইল [${prof.id} (${prof.email || prof.name || 'Anonymous'})]: auth.users-এ অনুপস্থিত থাকায় বাদ দেওয়া হয়েছে।`
            );
          }
        }
        // Only insert profiles whose authentication identity exists
        validRows = verifiedProfiles;
      }

      // If no valid rows to insert (e.g. all profiles were skipped due to missing auth users)
      if (validRows.length === 0) {
        continue;
      }

      // Process rows in batches of 50
      const batches = chunkArray(validRows, 50);

      for (let bIndex = 0; bIndex < batches.length; bIndex++) {
        const batch = batches[bIndex];

        const normalizedBatch = batch.map((r) => {
          const cleanObj: any = { ...r };
          delete cleanObj._temp;
          return cleanObj;
        });

        const { error: upsertError } = await supabase
          .from(tableName)
          .upsert(normalizedBatch, {
            onConflict: 'id',
            ignoreDuplicates: options.conflictStrategy === 'skip',
          });

        if (upsertError) {
          report.database.tables[tableName].failed += batch.length;
          report.database.failed += batch.length;
          report.database.tables[tableName].errors.push(
            `ব্যাচ #${bIndex + 1} (${batch.length} রেকর্ড) ব্যর্থ: ${upsertError.message}`
          );
        } else {
          report.database.tables[tableName].succeeded += batch.length;
          report.database.succeeded += batch.length;
        }
      }
    } catch (tblErr: any) {
      report.database.tables[tableName].failed += report.database.tables[tableName].total;
      report.database.failed += report.database.tables[tableName].total;
      report.database.tables[tableName].errors.push(`টেবিল পুনরুদ্ধার ব্যর্থ: ${tblErr.message}`);
    }
  }

  const finishedAt = new Date().toISOString();
  report.finishedAt = finishedAt;
  report.durationMs = Date.now() - startTime;

  const totalFailed = report.database.failed + report.storage.failed;
  report.success = totalFailed === 0 && report.errors.length === 0;

  report.summaryMessage = report.success
    ? `সফলভাবে পুনরুদ্ধার সম্পন্ন হয়েছে! মোট ${report.database.succeeded} টি ডেটাবেজ রেকর্ড এবং ${report.storage.succeeded} টি স্টোরেজ ফাইল রিস্টোর করা হয়েছে।`
    : `পুনরুদ্ধার সম্পন্ন হয়েছে তবে কিছু সতর্কতা দেখা দিয়েছে (${totalFailed} টি রেকর্ড/ফাইল ব্যর্থ, ${report.database.skipped} টি প্রোফাইল বাদ পড়েছে)।`;

  return report;
}
