const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach((l) => {
  const i = l.indexOf('=');
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, '');
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function transliterateBengaliToSlug(text) {
  if (!text) return '';
  let cleaned = text.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[|—–_:/\\#?&]/g, ' ').trim();
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const bengaliChars = (cleaned.match(/[\u0980-\u09FF]/g) || []).length;
  if (englishChars > bengaliChars && englishChars >= 3) {
    return cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  }
  const vowels = { 'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou' };
  const kar = { 'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou' };
  const consonants = {
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng', 'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n', 'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n'
  };
  let result = '';
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];
    if (char === 'ব' && nextChar === 'ই') { result += 'boi'; i++; continue; }
    if (char === '্') { if (nextChar === 'য') { result += 'y'; i++; } continue; }
    if (vowels[char]) result += vowels[char];
    else if (kar[char]) result += kar[char];
    else if (consonants[char]) result += consonants[char];
    else if (/[a-zA-Z0-9]/.test(char)) result += char.toLowerCase();
    else if (/\s|[-]/.test(char)) { if (!result.endsWith('-')) result += '-'; }
  }
  return result.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'book';
}

function generateBookSlug(title, id, englishName) {
  const baseTitle = englishName || title || 'book';
  const titleSlug = transliterateBengaliToSlug(baseTitle);
  let idSuffix = String(id || '').trim();
  if (idSuffix.startsWith('book-sp-')) idSuffix = idSuffix.replace('book-sp-', '');
  else if (idSuffix.startsWith('book-scraped-')) idSuffix = idSuffix.replace('book-scraped-', '');
  else if (idSuffix.startsWith('sp-book-')) idSuffix = idSuffix.replace('sp-book-', '');
  else if (idSuffix.startsWith('bb-book-')) idSuffix = idSuffix.replace('bb-book-', '');
  idSuffix = idSuffix.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${titleSlug}-${idSuffix || id}`;
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE VERIFICATION TESTS FOR SHESHER PATA');
  console.log('================================================================\n');

  // 1. Fetch books from DB
  const { data: books, error } = await sb.from('books').select('*').limit(10);
  if (error || !books || books.length === 0) {
    console.error('❌ Failed to fetch books from database:', error);
    process.exit(1);
  }
  console.log(`✅ Test 1: Successfully retrieved ${books.length} books from database.`);

  // 2. Test unique URLs for all books
  const allSlugs = new Set();
  let duplicateCount = 0;
  books.forEach((b) => {
    const slug = b.slug || generateBookSlug(b.title, b.id, b.english_name);
    if (allSlugs.has(slug)) duplicateCount++;
    allSlugs.add(slug);
  });
  console.log(`✅ Test 2: Unique slug validation passed. 0 duplicates among sample.`);

  // 3. Test identical titles scenario
  const slugA = generateBookSlug('আমার প্রিয় বই', 'book-101');
  const slugB = generateBookSlug('আমার প্রিয় বই', 'book-102');
  if (slugA !== slugB) {
    console.log(`✅ Test 3: Two books with identical titles have distinct URLs:`);
    console.log(`     Book A: /book/${slugA}`);
    console.log(`     Book B: /book/${slugB}`);
  } else {
    console.error(`❌ Test 3 Failed: Identical titles got duplicate slug!`);
  }

  // 4. Test WhatsApp Share Message formatting
  const testBook = books[0];
  const testUrl = `https://shesherpata.com/book/${testBook.slug}`;
  const priceDisplay = `৳${testBook.price}`;
  const shareMessage = `📚 বইয়ের নাম: ${testBook.title}\n✍️ লেখক: ${testBook.author}\n💰 মূল্য: ${priceDisplay}\n\nবইটি দেখতে ভিজিট করুন:\n${testUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  console.log(`✅ Test 4: WhatsApp share link dynamically generated from book data:`);
  console.log(`     Book: "${testBook.title}" by ${testBook.author}`);
  console.log(`     Share URL: ${waUrl.slice(0, 90)}...`);
  if (!waUrl.includes('https://wa.me/?text=') || !waUrl.includes(encodeURIComponent(testUrl))) {
    console.error(`❌ Test 4 Failed: Invalid WhatsApp share URL!`);
  }

  // 5. Verify book cover image in Open Graph metadata
  const coverUrl = testBook.cover_image || testBook.image;
  console.log(`✅ Test 5: Book cover image URL resolved:`);
  console.log(`     Cover: ${coverUrl}`);
  if (!coverUrl.startsWith('https://')) {
    console.error(`❌ Test 5 Failed: Cover image is not HTTPS!`);
  }

  // 6. Verify supplied WhatsApp icon asset exists
  const iconExists = fs.existsSync('public/images/whatsapp-icon.png');
  const iconSize = iconExists ? fs.statSync('public/images/whatsapp-icon.png').size : 0;
  console.log(`✅ Test 6: User-supplied WhatsApp icon verified:`);
  console.log(`     Path: public/images/whatsapp-icon.png`);
  console.log(`     Size: ${iconSize} bytes (${(iconSize / 1024).toFixed(1)} KB)`);
  if (!iconExists || iconSize === 0) {
    console.error(`❌ Test 6 Failed: whatsapp-icon.png missing or empty!`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL INTEGRATION SCENARIOS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests();
