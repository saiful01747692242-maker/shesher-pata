const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Parse environment variables
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (t && !t.startsWith('#') && t.includes('=')) {
    const idx = t.indexOf('=');
    let v = t.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.substring(0, idx).trim()] = v;
  }
}

// Stub 'server-only' package so tests run cleanly in Node outside Next.js webpack
try {
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  };
} catch {}

// Set up server environment for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.ADMIN_USERNAME = env.ADMIN_USERNAME || 'seshadmin';
process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
process.env.ADMIN_SESSION_SECRET = env.ADMIN_SESSION_SECRET;

const {
  createBackupArchive,
  calculateSha256,
  SUPPORTED_TABLES,
  SUPPORTED_BUCKETS,
} = require('../src/lib/backupEngine');

const {
  inspectAndSanitizeZip,
  previewBackupArchive,
  executeRestore,
  RESTORE_DEPENDENCY_ORDER,
} = require('../src/lib/restoreEngine');

async function runTestSuite() {
  console.log('================================================================');
  console.log('SHESHER PATA: BACKUP & RESTORE VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failedTests++;
    }
  }

  // ------------------------------------------------------------------
  // TEST 1: Complete Backup Generation (All Tables + Storage + Schema)
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Generating Complete Website Backup ---');
  const completeBackup = await createBackupArchive('all', 'test-admin');
  assert(Buffer.isBuffer(completeBackup.buffer), 'Archive buffer generated as valid Node Buffer');
  assert(completeBackup.buffer.length > 50000, `Archive size is substantial (${(completeBackup.buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  assert(completeBackup.fileName.startsWith('shesher-pata-all-backup-'), `File name format is correct: ${completeBackup.fileName}`);

  // Inspect ZIP Contents
  const zip = await JSZip.loadAsync(completeBackup.buffer);
  assert(Boolean(zip.file('manifest.json')), 'ZIP contains manifest.json');
  assert(Boolean(zip.file('README.txt')), 'ZIP contains README.txt');
  assert(Boolean(zip.file('schema.sql')), 'ZIP contains schema.sql');

  // Verify manifest contents
  const manifestRaw = await zip.file('manifest.json').async('string');
  const manifest = JSON.parse(manifestRaw);
  assert(manifest.manifestVersion === '2.0.0', 'Manifest version is 2.0.0');
  assert(manifest.backupType === 'all', 'Manifest backupType is "all"');
  assert(manifest.database.totalRecords > 0, `Database exported records: ${manifest.database.totalRecords}`);

  // Check all 11 tables are in manifest and in ZIP data/
  for (const tbl of SUPPORTED_TABLES) {
    assert(Boolean(manifest.database.tables[tbl]), `Manifest includes table metadata for "${tbl}"`);
    assert(Boolean(zip.file(`data/${tbl}.json`)), `ZIP contains data/${tbl}.json`);
  }

  // Verify Unicode Bengali Preservation in data/books.json
  const booksJson = await zip.file('data/books.json').async('string');
  const booksData = JSON.parse(booksJson);
  const sampleBookWithBn = booksData.find(b => b.title_bn || b.bangla_name || b.title);
  assert(Boolean(sampleBookWithBn), 'Found book records in export');
  assert(
    /[\u0980-\u09FF]/.test(booksJson),
    'Bangla Unicode characters properly preserved in books.json without escaping corruption'
  );

  // Check storage files in ZIP
  let storageFileCount = 0;
  for (const p of Object.keys(zip.files)) {
    if (p.startsWith('storage/book-covers/') && !zip.files[p].dir) {
      storageFileCount++;
    }
  }
  assert(storageFileCount > 0, `Storage files preserved with binaries: ${storageFileCount} files found in storage/book-covers/`);

  // Verify SHA-256 Checksum of books.json matches manifest
  const computedBooksHash = calculateSha256(booksJson);
  assert(
    computedBooksHash === manifest.database.tables['books'].sha256,
    `books.json SHA-256 checksum exactly matches manifest (${computedBooksHash.substring(0, 16)}...)`
  );

  // ------------------------------------------------------------------
  // TEST 2: Individual Category Backups
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Testing Individual Category Backups ---');
  const categoriesToTest = ['books', 'authors', 'categories', 'orders', 'reviews', 'profiles', 'settings', 'publishers'];

  for (const cat of categoriesToTest) {
    const singleBackup = await createBackupArchive(cat, 'test-admin');
    assert(
      singleBackup.manifest.backupType === cat,
      `Category backup for "${cat}" generated successfully (${(singleBackup.buffer.length / 1024).toFixed(1)} KB)`
    );
  }

  // ------------------------------------------------------------------
  // TEST 3: Security & Anti-Exploit Validation
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Security & Anti-Exploit Validation ---');

  // 3.1 Path Traversal Attack Test
  const maliciousZip1 = new JSZip();
  maliciousZip1.file('../../../windows/system32/evil.txt', 'malicious content');
  const malBuf1 = await maliciousZip1.generateAsync({ type: 'nodebuffer' });
  const check1 = await inspectAndSanitizeZip(malBuf1);
  assert(
    check1.errors.some(e => e.includes('বেআইনি ফাইল পাথ') || e.includes('নিরাপত্তা')),
    'Path traversal attempt (../evil.txt) successfully detected and blocked'
  );

  // 3.2 Malicious Executable Rejection Test
  const maliciousZip2 = new JSZip();
  maliciousZip2.file('storage/book-covers/trojan.exe', Buffer.from([0x4D, 0x5A, 0x90]));
  const malBuf2 = await maliciousZip2.generateAsync({ type: 'nodebuffer' });
  const check2 = await inspectAndSanitizeZip(malBuf2);
  assert(
    check2.errors.some(e => e.includes('এক্সিকিউটেবল')),
    'Executable payload (.exe) successfully detected and blocked'
  );

  // 3.3 Corrupted Buffer Handling
  const check3 = await inspectAndSanitizeZip(Buffer.from('not a zip file content'));
  assert(
    check3.errors.some(e => e.includes('বৈধ ZIP ফরম্যাটে নেই')),
    'Corrupt / non-zip archive safely handled with error reporting'
  );

  // ------------------------------------------------------------------
  // TEST 4: Archive Preview & Conflict Analysis
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Archive Preview & Conflict Analysis ---');
  const preview = await previewBackupArchive(completeBackup.buffer);
  assert(preview.valid === true, 'Preview validation reports valid === true');
  assert(preview.checksumStatus === 'verified', 'Preview confirms all SHA-256 checksums verified');
  assert(preview.conflicts.length > 0, `Conflict analysis returned ${preview.conflicts.length} analyzed tables`);

  const booksConflict = preview.conflicts.find(c => c.tableName === 'books');
  assert(Boolean(booksConflict), 'Conflict analysis correctly inspected "books" table');
  if (booksConflict) {
    assert(booksConflict.totalInBackup === booksData.length, `Backup books count matches (${booksConflict.totalInBackup})`);
    assert(booksConflict.existingInDb > 0, `Detected existing records in DB (${booksConflict.existingInDb} existing)`);
  }

  // ------------------------------------------------------------------
  // TEST 5: Restore Dependency Ordering & Safety
  // ------------------------------------------------------------------
  console.log('\n--- TEST 5: Restore Dependency Ordering & Safety ---');
  assert(
    RESTORE_DEPENDENCY_ORDER[0] === 'site_settings' &&
    RESTORE_DEPENDENCY_ORDER.indexOf('categories') < RESTORE_DEPENDENCY_ORDER.indexOf('books') &&
    RESTORE_DEPENDENCY_ORDER.indexOf('authors') < RESTORE_DEPENDENCY_ORDER.indexOf('books') &&
    RESTORE_DEPENDENCY_ORDER.indexOf('books') < RESTORE_DEPENDENCY_ORDER.indexOf('reviews'),
    'Restore dependency order correctly prioritizes independent parents before foreign key dependents'
  );

  // Test full replacement requires exact confirmation code
  const fakeFullRestore = await executeRestore(completeBackup.buffer, {
    mode: 'full',
    confirmationCode: 'WRONG_CODE',
  });
  assert(
    fakeFullRestore.success === false && fakeFullRestore.errors.some(e => e.includes('কনফার্মেশন কোড')),
    'Full replacement restore strictly blocked without exact confirmation code (CONFIRM_FULL_RESTORE)'
  );

  // ------------------------------------------------------------------
  // TEST 6: Publishers Schema & Dependencies
  // ------------------------------------------------------------------
  console.log('\n--- TEST 6: Publishers Schema & Dependency Verification ---');
  const schemaSqlContent = fs.readFileSync('supabase_schema.sql', 'utf8');
  assert(
    schemaSqlContent.includes('CREATE TABLE IF NOT EXISTS public.publishers'),
    'supabase_schema.sql contains CREATE TABLE IF NOT EXISTS public.publishers'
  );
  assert(
    schemaSqlContent.includes('location TEXT') &&
    schemaSqlContent.includes('logo TEXT') &&
    schemaSqlContent.includes('book_count INTEGER DEFAULT 0'),
    'publishers table in supabase_schema.sql contains all live columns and constraints'
  );
  assert(
    RESTORE_DEPENDENCY_ORDER.indexOf('publishers') !== -1 &&
    RESTORE_DEPENDENCY_ORDER.indexOf('publishers') < RESTORE_DEPENDENCY_ORDER.indexOf('books'),
    'publishers table is restored before books in RESTORE_DEPENDENCY_ORDER'
  );

  // ------------------------------------------------------------------
  // TEST 7: Archive Security & Preflight Size / Entry Limits
  // ------------------------------------------------------------------
  console.log('\n--- TEST 7: Archive Security & Preflight Limits ---');

  // 7.1 Oversized Archive Rejection (>100MB limit check)
  const fakeBigBuffer = Buffer.from('PK\x03\x04test');
  Object.defineProperty(fakeBigBuffer, 'length', { value: 105 * 1024 * 1024 });
  const checkOversized = await inspectAndSanitizeZip(fakeBigBuffer);
  assert(
    checkOversized.errors.some(e => e.includes('১০০ মেগাবাইট') || e.includes('আকার')),
    'Oversized compressed archive (> 100 MB) rejected before processing'
  );

  // 7.2 Excessive Entry Count Detection (>5,000 files)
  const manyEntriesZip = new JSZip();
  for (let i = 0; i < 5005; i++) {
    manyEntriesZip.file(`file_${i}.txt`, '');
  }
  const manyEntriesBuf = await manyEntriesZip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  const checkManyEntries = await inspectAndSanitizeZip(manyEntriesBuf);
  assert(
    checkManyEntries.errors.some(e => e.includes('সর্বোচ্চ সীমা') || e.includes('5000') || e.includes('৫,০০০')),
    'Archive exceeding maximum entry count (5,000 files) is rejected'
  );

  // 7.3 Suspicious Compression Ratio (Zip Bomb Protection: > 100:1)
  const bombZip = new JSZip();
  bombZip.file('data/huge_text.txt', '0'.repeat(300000)); // highly compressible
  const bombBuf = await bombZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  const checkZipBomb = await inspectAndSanitizeZip(bombBuf);
  assert(
    checkZipBomb.errors.some(e => e.includes('কম্প্রেশন রেশিও') || e.includes('সন্দেহজনক')),
    'Suspicious compression ratio (> 100:1 zip-bomb attempt) blocked'
  );

  // ------------------------------------------------------------------
  // TEST 8: Missing Auth Users & Profile Recovery Safeguards
  // ------------------------------------------------------------------
  console.log('\n--- TEST 8: Missing Auth Users & Profile Recovery Safeguards ---');
  // Create a synthetic backup containing a profile with an imaginary non-existent UUID
  const syntheticZip = new JSZip();
  const fakeUserId = '00000000-0000-0000-0000-000000000099';
  const syntheticProfiles = [
    {
      id: fakeUserId,
      full_name: 'Synthetic Ghost User',
      phone: '01700000099',
      role: 'customer',
      address: 'Ghost Street',
      created_at: new Date().toISOString(),
    },
  ];
  syntheticZip.file('manifest.json', JSON.stringify({
    manifestVersion: '2.0.0',
    backupType: 'profiles',
    createdAt: new Date().toISOString(),
    database: {
      totalRecords: 1,
      tables: {
        profiles: {
          count: 1,
          sha256: calculateSha256(JSON.stringify(syntheticProfiles)),
        },
      },
    },
    storage: { totalFiles: 0, buckets: {} },
  }));
  syntheticZip.file('data/profiles.json', JSON.stringify(syntheticProfiles));
  const syntheticBuf = await syntheticZip.generateAsync({ type: 'nodebuffer' });

  // Execute safe restore with the synthetic archive
  const syntheticRestore = await executeRestore(syntheticBuf, {
    mode: 'safe',
    conflictStrategy: 'skip',
    restoreStorage: false,
  });

  assert(
    syntheticRestore.skippedProfiles &&
    syntheticRestore.skippedProfiles.some(p => p.id === fakeUserId),
    'Profiles without matching auth.users identities are safely skipped and reported in skippedProfiles without crashing'
  );
  assert(
    syntheticRestore.database?.tables?.profiles && syntheticRestore.database.tables.profiles.skipped >= 1,
    'Database restore report tracks skipped profile count accurately'
  );

  // ------------------------------------------------------------------
  // TEST 9: Safe Merge Conflict Handling & Storage Isolation
  // ------------------------------------------------------------------
  console.log('\n--- TEST 9: Safe Merge & Storage Safeguards ---');
  assert(
    preview.preflight && preview.preflight.schemaCompatible === true,
    'Preflight check confirms target schema is compatible with backup archive'
  );
  assert(
    preview.preflight && preview.preflight.storageCompatible === true,
    'Preflight check confirms storage buckets exist and are accessible'
  );
  assert(
    fakeFullRestore.isAtomic === false,
    'Restore report explicitly documents that multi-batch operations are non-atomic'
  );

  // ------------------------------------------------------------------
  // TEST SUMMARY
  // ------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
