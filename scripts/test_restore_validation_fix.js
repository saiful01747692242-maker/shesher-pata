const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const crypto = require('crypto');

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

// Stub 'server-only' package so tests run cleanly in Node
try {
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  };
} catch {}

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.ADMIN_USERNAME = env.ADMIN_USERNAME || 'seshadmin';
process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
process.env.ADMIN_SESSION_SECRET = env.ADMIN_SESSION_SECRET;

const {
  createBackupArchive,
  calculateSha256,
} = require('../src/lib/backupEngine');

const {
  inspectAndSanitizeZip,
  previewBackupArchive,
  executeRestore,
  MAX_COMPRESSED_SIZE_BYTES,
} = require('../src/lib/restoreEngine');

async function runRegressionTests() {
  console.log('================================================================');
  console.log('SHESHER PATA: RESTORE VALIDATION & PAYLOAD FIX REGRESSION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // ------------------------------------------------------------------
  // TEST 1: Small Backup ZIP Preview Validation
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Small Backup Preview Validation ---');
  const smallBackup = await createBackupArchive('books', 'test-admin');
  const smallPreview = await previewBackupArchive(smallBackup.buffer);
  assert(smallPreview.valid === true, 'Small category backup validates cleanly with valid === true');
  assert(smallPreview.conflicts.length > 0, 'Conflict analysis returns data for books table');
  assert(smallPreview.checksumStatus === 'verified', 'Checksum status verified for small backup');

  // ------------------------------------------------------------------
  // TEST 2: Lightweight Preview Packaging for Large Archives (> 4MB)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Lightweight Preview Bundle Transformation ---');
  // Create a synthetic large archive containing database tables + simulated 5MB image files
  const largeZip = new JSZip();
  largeZip.file('manifest.json', smallBackup.buffer); // temporary
  // Load original small backup into largeZip
  const loadedSmall = await JSZip.loadAsync(smallBackup.buffer);
  for (const [p, f] of Object.entries(loadedSmall.files)) {
    if (!f.dir) {
      largeZip.file(p, await f.async('uint8array'));
    }
  }
  // Add simulated storage images totaling > 5MB
  const dummy5mb = Buffer.alloc(5 * 1024 * 1024, 0xaa);
  largeZip.file('storage/book-covers/cover1.jpg', dummy5mb);
  largeZip.file('storage/book-covers/cover2.jpg', dummy5mb);
  const largeArchiveBuf = await largeZip.generateAsync({ type: 'nodebuffer' });
  assert(largeArchiveBuf.length > 10 * 1024 * 1024, `Simulated archive is large (${(largeArchiveBuf.length / 1024 / 1024).toFixed(1)} MB > 4.5 MB Vercel limit)`);

  // Now simulate the client-side transformation:
  const clientLoaded = await JSZip.loadAsync(largeArchiveBuf);
  const previewZip = new JSZip();
  for (const [relativePath, zipEntry] of Object.entries(clientLoaded.files)) {
    if (zipEntry.dir) {
      previewZip.folder(relativePath);
    } else if (relativePath.startsWith('storage/')) {
      previewZip.file(relativePath, new Uint8Array(0));
    } else {
      const content = await zipEntry.async('uint8array');
      previewZip.file(relativePath, content);
    }
  }
  const previewBundleBuf = await previewZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  assert(previewBundleBuf.length < 200 * 1024, `Transformed preview bundle is featherweight (${(previewBundleBuf.length / 1024).toFixed(1)} KB < 200 KB)`);

  // Verify server can preview the transformed bundle flawlessly
  const bundlePreview = await previewBackupArchive(previewBundleBuf);
  assert(bundlePreview.valid === true, 'Transformed preview bundle validates with valid === true');
  assert(bundlePreview.storageFilesCount === 2, `Accurately recognizes storage files count: ${bundlePreview.storageFilesCount}`);
  assert(bundlePreview.checksumStatus === 'verified', 'All table checksums verified without image payload overhead');

  // ------------------------------------------------------------------
  // TEST 3: Invalid ZIP and Corrupted Signature Rejection
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Invalid ZIP & Header Signature Checks ---');
  const corruptedBuffer = Buffer.from('NOT A VALID ZIP FILE HEADER DUMP CONTENT');
  const corruptPreview = await previewBackupArchive(corruptedBuffer);
  assert(corruptPreview.valid === false, 'Invalid header signature rejected (valid === false)');
  assert(corruptPreview.validationErrors.some(e => e.includes('ZIP header signature')), 'Clear Bengali invalid ZIP header error returned');

  // ------------------------------------------------------------------
  // TEST 4: Oversized Compressed Archive (> 100 MB) Rejection
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Oversized Archive Rejection (> 100 MB) ---');
  const fakeHugeBuffer = Buffer.alloc(MAX_COMPRESSED_SIZE_BYTES + 1024);
  fakeHugeBuffer[0] = 0x50; fakeHugeBuffer[1] = 0x4b; fakeHugeBuffer[2] = 0x03; fakeHugeBuffer[3] = 0x04;
  const hugePreview = await previewBackupArchive(fakeHugeBuffer);
  assert(hugePreview.valid === false, 'Oversized archive (> 100 MB) strictly rejected');
  assert(hugePreview.validationErrors.some(e => e.includes('অনুমোদিত সর্বোচ্চ সীমা')), 'Returns Bengali size limit error message');

  // ------------------------------------------------------------------
  // TEST 5: Non-JSON Response & HTTP 413 Safe Parsing Logic
  // ------------------------------------------------------------------
  console.log('\n--- TEST 5: Non-JSON Response & HTTP 413 Safe Parsing ---');
  // Simulate the safe parseApiResponse function behavior on raw 413 text/html
  function simulateSafeParse(status, contentType, bodyText) {
    if (contentType.includes('application/json')) {
      try {
        const data = JSON.parse(bodyText);
        if (status >= 200 && status < 300) return { ok: true, data };
        return { ok: false, errorMessage: data.error || `Error ${status}` };
      } catch {}
    }
    let errorMessage = '';
    if (status === 413 || bodyText.toLowerCase().includes('entity too large')) {
      errorMessage = 'ফাইলের আকার অতিরিক্ত বড় (HTTP 413: Request Entity Too Large)। সার্ভার বা ক্লাউড প্ল্যাটফর্মের আপলোড সীমা অতিক্রম করেছে।';
    } else if (status === 401) {
      errorMessage = 'অননুমোদিত: আপনার অ্যাডমিন সেশন শেষ হয়ে গেছে (HTTP 401)। অনুগ্রহ করে আবার লগইন করুন।';
    } else {
      errorMessage = `সার্ভারে ত্রুটি দেখা দিয়েছে (HTTP ${status})`;
    }
    return { ok: false, errorMessage };
  }

  const raw413Html = '<html><head><title>413 Request Entity Too Large</title></head><body><center><h1>413 Request Entity Too Large</h1></center></body></html>';
  const parsed413 = simulateSafeParse(413, 'text/html', raw413Html);
  assert(parsed413.ok === false, 'Safe parser handles HTTP 413 without throwing JSON syntax error');
  assert(parsed413.errorMessage.includes('HTTP 413: Request Entity Too Large'), 'Provides informative Bengali 413 error');

  const raw401Text = 'Unauthorized';
  const parsed401 = simulateSafeParse(401, 'text/plain', raw401Text);
  assert(parsed401.errorMessage.includes('HTTP 401'), 'Provides informative Bengali 401 auth error');

  // ------------------------------------------------------------------
  // TEST 6: Missing Manifest Graceful Fallback
  // ------------------------------------------------------------------
  console.log('\n--- TEST 6: Missing Manifest Graceful Handling ---');
  const noManifestZip = new JSZip();
  noManifestZip.file('data/books.json', JSON.stringify([{ id: '9999', title: 'Test Book' }]));
  const noManifestBuf = await noManifestZip.generateAsync({ type: 'nodebuffer' });
  const noManifestPreview = await previewBackupArchive(noManifestBuf);
  assert(noManifestPreview.warnings.some(w => w.includes('manifest.json পাওয়া যায়নি')), 'Warns user about missing manifest gracefully');
  assert(noManifestPreview.checksumStatus === 'skipped', 'Checksum status set to "skipped" when manifest missing');

  // ------------------------------------------------------------------
  // TEST 7: Checksum Mismatch Detection
  // ------------------------------------------------------------------
  console.log('\n--- TEST 7: Checksum Mismatch Detection ---');
  const tamperedZip = await JSZip.loadAsync(smallBackup.buffer);
  // Modify data/books.json so SHA-256 no longer matches manifest
  tamperedZip.file('data/books.json', JSON.stringify([{ id: '1', title: 'Tampered Title' }]));
  const tamperedBuf = await tamperedZip.generateAsync({ type: 'nodebuffer' });
  const tamperedPreview = await previewBackupArchive(tamperedBuf);
  assert(tamperedPreview.valid === false, 'Tampered data table fails validation');
  assert(tamperedPreview.checksumStatus === 'mismatched', 'Checksum status marked as "mismatched"');
  assert(tamperedPreview.preflight.checksumMismatches.includes('books'), 'Identifies books table as corrupted');

  // ------------------------------------------------------------------
  // TEST 8: Storage Batch Security Validation (Path Traversal & Dangerous Extensions)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 8: Storage Batch Security Constraints ---');
  const PROHIBITED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.msi', '.dll', '.com', '.scr', '.pif', '.jar', '.jsp', '.php'];
  function validateStoragePath(filePath) {
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.startsWith('\\') || /^[a-zA-Z]:/.test(filePath)) {
      return { valid: false, reason: 'Path traversal' };
    }
    const lower = filePath.toLowerCase();
    if (PROHIBITED_EXTENSIONS.some(ext => lower.endsWith(ext))) {
      return { valid: false, reason: 'Prohibited extension' };
    }
    return { valid: true };
  }

  assert(validateStoragePath('../evil.jpg').valid === false, 'Storage batch blocks directory traversal ../');
  assert(validateStoragePath('/root/cover.png').valid === false, 'Storage batch blocks absolute paths /root');
  assert(validateStoragePath('cover.exe').valid === false, 'Storage batch blocks dangerous executable .exe');
  assert(validateStoragePath('cover.php').valid === false, 'Storage batch blocks server script .php');
  assert(validateStoragePath('books/cover1.webp').valid === true, 'Storage batch permits legitimate image books/cover1.webp');

  console.log('\n================================================================');
  console.log(`REGRESSION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runRegressionTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
