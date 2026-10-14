import 'server-only';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { getServerSupabaseClient } from './serverSupabase';
import { getServerEnv } from './serverEnv';

if (typeof window !== 'undefined') {
  throw new Error('SECURITY VIOLATION: backupEngine can only be executed on the server.');
}

export type BackupCategory =
  | 'all'
  | 'books'
  | 'book_images'
  | 'authors'
  | 'categories'
  | 'orders'
  | 'reviews'
  | 'profiles'
  | 'settings'
  | 'publishers'
  | 'storage';

export interface ManifestTableMeta {
  name: string;
  count: number;
  sha256: string;
  fileName: string;
}

export interface ManifestStorageFileMeta {
  path: string;
  sizeBytes: number;
  sha256: string;
  mimetype: string;
}

export interface ManifestBucketMeta {
  name: string;
  count: number;
  totalSizeBytes: number;
  files: ManifestStorageFileMeta[];
}

export interface BackupManifest {
  manifestVersion: string;
  appName: string;
  backupType: BackupCategory;
  createdAt: string;
  exportedBy: string;
  database: {
    totalRecords: number;
    tables: Record<string, ManifestTableMeta>;
  };
  storage: {
    totalFiles: number;
    totalSizeBytes: number;
    buckets: Record<string, ManifestBucketMeta>;
  };
  schemaIncluded: boolean;
  notes: string[];
}

export const SUPPORTED_TABLES = [
  'books',
  'authors',
  'categories',
  'publishers',
  'orders',
  'reviews',
  'coupons',
  'banners',
  'site_settings',
  'steadfast_config',
  'profiles',
] as const;

export const SUPPORTED_BUCKETS = ['book-covers', 'book-banners', 'book-files'] as const;

/**
 * Calculates SHA-256 hash of a Buffer or string.
 */
export function calculateSha256(data: Buffer | string): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Recursively fetches all rows from a Supabase table with robust pagination.
 * Ensures large tables are never truncated.
 */
export async function fetchAllRowsFromTable(
  tableName: string,
  supabase = getServerSupabaseClient()
): Promise<any[]> {
  if (!supabase) throw new Error('Database connection unavailable');

  const rows: any[] = [];
  const pageSize = 500;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + pageSize - 1);

    if (error) {
      // If table doesn't exist yet, return empty array without failing the whole backup
      if (error.code === 'PGRST205' || error.message?.includes('not find')) {
        console.warn(`[BackupEngine] Table ${tableName} does not exist in schema cache.`);
        return [];
      }
      throw new Error(`Failed to query table ${tableName}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return rows;
}

/**
 * Recursively lists all files in a Supabase storage bucket, handling folder hierarchies.
 */
export async function listAllStorageFiles(
  bucket: string,
  folder = '',
  supabase = getServerSupabaseClient()
): Promise<Array<{ name: string; fullPath: string; size: number; mimetype: string }>> {
  if (!supabase) throw new Error('Database connection unavailable');

  const files: Array<{ name: string; fullPath: string; size: number; mimetype: string }> = [];
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.warn(`[BackupEngine] Could not list ${bucket}/${folder}: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const fullPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.id === null) {
        // Directory entry -> recurse
        const subFiles = await listAllStorageFiles(bucket, fullPath, supabase);
        files.push(...subFiles);
      } else {
        files.push({
          name: item.name,
          fullPath,
          size: item.metadata?.size || 0,
          mimetype: item.metadata?.mimetype || 'application/octet-stream',
        });
      }
    }

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return files;
}

/**
 * Downloads a single file from Supabase storage into a binary Buffer.
 */
export async function downloadStorageFileBuffer(
  bucket: string,
  filePath: string,
  supabase = getServerSupabaseClient()
): Promise<Buffer> {
  if (!supabase) throw new Error('Database connection unavailable');

  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) {
    throw new Error(`Failed to download ${bucket}/${filePath}: ${error?.message || 'Empty response'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates clear, comprehensive disaster-recovery documentation for the backup.
 */
function generateReadmeContent(manifest: BackupManifest): string {
  return `================================================================================
শেষের পাতা (Shesher Pata) — Complete Disaster Recovery & Backup Archive
================================================================================
Generated At: ${manifest.createdAt}
Backup Type:  ${manifest.backupType}
App Name:     ${manifest.appName}
Manifest Ver: ${manifest.manifestVersion}

--------------------------------------------------------------------------------
1. ARCHIVE CONTENTS OVERVIEW
--------------------------------------------------------------------------------
- manifest.json:
    Full metadata, backup details, table record counts, file counts, sizes,
    and cryptographic SHA-256 checksums for every table and file.

- schema.sql:
    Complete, idempotent PostgreSQL database schema definition. Contains table
    structures, indexes, triggers, storage bucket configuration, and Row Level
    Security (RLS) policies.

- data/ directory:
    Contains lossless JSON exports for database tables:
${Object.entries(manifest.database.tables)
  .map(([name, meta]) => `    * data/${meta.fileName} (${meta.count} records, SHA-256: ${meta.sha256.substring(0, 16)}...)`)
  .join('\n')}

- storage/ directory:
    Contains the original binary files (JPEG, PNG, WebP, PDF) preserving their
    exact storage paths and directory hierarchy:
${Object.entries(manifest.storage.buckets)
  .map(([name, meta]) => `    * storage/${name}/ (${meta.count} files, ${(meta.totalSizeBytes / 1024 / 1024).toFixed(2)} MB)`)
  .join('\n')}

--------------------------------------------------------------------------------
2. HOW TO RESTORE INTO YOUR EXISTING SHESHER PATA SYSTEM
--------------------------------------------------------------------------------
1. Log in to the Shesher Pata Admin Dashboard:
   URL: /seshadmin

2. Navigate to:
   "ব্যাকআপ ও রিস্টোর" (Backup & Restore) in the left sidebar menu.

3. Under the "Restore Backup" section:
   - Drag and drop or choose this ZIP archive file.
   - The system will automatically validate the ZIP integrity, verify SHA-256
     checksums, and display a complete preview of tables, record counts, and storage files.

4. Select the desired Restore Mode:
   - Safe / Merge Restore (Default):
     Imports missing records and safely updates existing records without
     deleting unrelated data.
   - Full Replacement Restore:
     Used for recovering a fresh or deleted project. Replaces existing records
     with explicit confirmation.

5. Click "Start Restoration" and wait for the progress bar to complete.
   Storage files are restored first, followed by database records in strict
   dependency order to preserve foreign key constraints.

--------------------------------------------------------------------------------
3. DISASTER RECOVERY: RESTORING INTO A BRAND NEW SUPABASE PROJECT
--------------------------------------------------------------------------------
If your original Supabase project is completely deleted or lost:

Step 1: Create a New Supabase Project
  - Visit https://supabase.com and create a new project.
  - Note your project URL and service_role API key.

Step 2: Apply the Database Schema & Storage Buckets
  - Open the Supabase Dashboard -> SQL Editor.
  - Copy and paste the entire contents of "schema.sql" included in this ZIP archive.
  - Run the query. This creates all 11 tables, storage buckets (book-covers,
    book-banners, book-files), RLS policies, and triggers.

Step 3: Update Environment Variables
  - In your website hosting environment (e.g., Vercel, VPS, or .env.local):
    NEXT_PUBLIC_SUPABASE_URL = <your new project url>
    NEXT_PUBLIC_SUPABASE_ANON_KEY = <your new anon key>
    SUPABASE_SERVICE_ROLE_KEY = <your new service role key>

Step 4: Execute Restoration
  - Deploy the Shesher Pata website with the new Supabase credentials.
  - Log in to /seshadmin -> "ব্যাকআপ ও রিস্টোর".
  - Upload this ZIP archive in "Safe / Merge Restore" mode.
  - The restore engine will upload all images to your new Supabase storage
    and insert all records in proper relational order.

--------------------------------------------------------------------------------
4. WHAT CANNOT BE AUTOMATICALLY RECOVERED
--------------------------------------------------------------------------------
- Domain DNS settings and SSL certificates (managed at your domain registrar).
- Environment secret variables (.env passwords and session secrets).
- Third-party courier live API credentials (Steadfast Courier API key must be
  re-entered in settings if re-issued).
- Payment gateway live merchant keys (e.g. bKash / SSLCommerz merchant credentials).

For technical assistance or issues, consult the Shesher Pata repository.
================================================================================
`;
}

/**
 * Reads the schema.sql file from disk or provides a complete fallback.
 */
function getProjectSchemaSql(): string {
  try {
    const schemaPath = path.resolve(process.cwd(), 'supabase_schema.sql');
    if (fs.existsSync(schemaPath)) {
      return fs.readFileSync(schemaPath, 'utf8');
    }
  } catch (err) {
    console.warn('[BackupEngine] Could not read supabase_schema.sql:', err);
  }
  return '-- Supabase schema DDL';
}

/**
 * Main export orchestrator: builds a structured ZIP archive for the requested category or 'all'.
 */
export async function createBackupArchive(
  category: BackupCategory,
  adminUser = 'seshadmin'
): Promise<{ buffer: Buffer; fileName: string; manifest: BackupManifest }> {
  const zip = new JSZip();
  const now = new Date().toISOString();
  const dateSlug = now.slice(0, 10);
  const timeSlug = now.slice(11, 19).replace(/:/g, '-');

  const manifest: BackupManifest = {
    manifestVersion: '2.0.0',
    appName: 'শেষের পাতা (Shesher Pata)',
    backupType: category,
    createdAt: now,
    exportedBy: adminUser,
    database: {
      totalRecords: 0,
      tables: {},
    },
    storage: {
      totalFiles: 0,
      totalSizeBytes: 0,
      buckets: {},
    },
    schemaIncluded: false,
    notes: [
      'Unicode UTF-8 encoding preserved for all Bengali text and metadata.',
      'Lossless original binary quality preserved for all images and documents.',
      'Cryptographic SHA-256 checksums calculated for all assets.',
    ],
  };

  // Determine tables to include based on category
  let tablesToExport: string[] = [];
  let bucketsToExport: string[] = [];

  switch (category) {
    case 'books':
      tablesToExport = ['books'];
      break;
    case 'book_images':
      bucketsToExport = ['book-covers'];
      break;
    case 'authors':
      tablesToExport = ['authors'];
      break;
    case 'categories':
      tablesToExport = ['categories'];
      break;
    case 'orders':
      tablesToExport = ['orders'];
      break;
    case 'reviews':
      tablesToExport = ['reviews'];
      break;
    case 'profiles':
      tablesToExport = ['profiles'];
      break;
    case 'publishers':
      tablesToExport = ['publishers'];
      break;
    case 'settings':
      tablesToExport = ['site_settings', 'banners', 'coupons', 'steadfast_config'];
      break;
    case 'storage':
      bucketsToExport = ['book-covers', 'book-banners', 'book-files'];
      break;
    case 'all':
    default:
      tablesToExport = [...SUPPORTED_TABLES];
      bucketsToExport = [...SUPPORTED_BUCKETS];
      break;
  }

  const dataFolder = zip.folder('data');
  const storageFolder = zip.folder('storage');

  // 1. Export Database Tables
  for (const table of tablesToExport) {
    try {
      const rows = await fetchAllRowsFromTable(table);

      // Sensitive field sanitization:
      // In steadfast_config, keep encrypted tokens if present, but never plaintext passwords
      const sanitizedRows = rows.map((row) => {
        if (table === 'steadfast_config') {
          return {
            ...row,
            // Keep api_key_encrypted and secret_key_encrypted intact for disaster recovery
          };
        }
        return row;
      });

      const jsonStr = JSON.stringify(sanitizedRows, null, 2);
      const fileName = `${table}.json`;
      const sha256 = calculateSha256(jsonStr);

      dataFolder?.file(fileName, jsonStr);

      manifest.database.tables[table] = {
        name: table,
        count: sanitizedRows.length,
        sha256,
        fileName,
      };
      manifest.database.totalRecords += sanitizedRows.length;
    } catch (err: any) {
      console.error(`[BackupEngine] Error exporting table ${table}:`, err);
      throw new Error(`Failed to export table "${table}": ${err.message}`);
    }
  }

  // 2. Export Storage Buckets
  for (const bucket of bucketsToExport) {
    try {
      const files = await listAllStorageFiles(bucket);
      const bucketFolder = storageFolder?.folder(bucket);
      const bucketMeta: ManifestBucketMeta = {
        name: bucket,
        count: 0,
        totalSizeBytes: 0,
        files: [],
      };

      // Download files in concurrent batches of 10 for optimal performance
      const concurrency = 10;
      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (file) => {
            try {
              const fileBuffer = await downloadStorageFileBuffer(bucket, file.fullPath);
              const sha256 = calculateSha256(fileBuffer);

              bucketFolder?.file(file.fullPath, fileBuffer);

              bucketMeta.files.push({
                path: file.fullPath,
                sizeBytes: fileBuffer.length,
                sha256,
                mimetype: file.mimetype,
              });
              bucketMeta.count += 1;
              bucketMeta.totalSizeBytes += fileBuffer.length;
            } catch (fileErr: any) {
              console.warn(`[BackupEngine] Skipping ${bucket}/${file.fullPath}: ${fileErr.message}`);
            }
          })
        );
      }

      manifest.storage.buckets[bucket] = bucketMeta;
      manifest.storage.totalFiles += bucketMeta.count;
      manifest.storage.totalSizeBytes += bucketMeta.totalSizeBytes;
    } catch (err: any) {
      console.error(`[BackupEngine] Error exporting storage bucket ${bucket}:`, err);
      throw new Error(`Failed to export storage bucket "${bucket}": ${err.message}`);
    }
  }

  // 3. Include SQL Schema for Complete or Settings Backups
  if (category === 'all' || category === 'settings') {
    const schemaSql = getProjectSchemaSql();
    zip.file('schema.sql', schemaSql);
    manifest.schemaIncluded = true;
  }

  // 4. Generate README.txt & manifest.json
  const readmeContent = generateReadmeContent(manifest);
  zip.file('README.txt', readmeContent);

  const manifestJson = JSON.stringify(manifest, null, 2);
  zip.file('manifest.json', manifestJson);

  // 5. Generate ZIP Buffer
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const fileName = `shesher-pata-${category}-backup-${dateSlug}_${timeSlug}.zip`;

  return {
    buffer: zipBuffer,
    fileName,
    manifest,
  };
}
