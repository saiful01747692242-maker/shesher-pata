const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach((l) => {
  const i = l.indexOf('=');
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, '');
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function transliterateBengali(text) {
  if (!text) return '';

  let cleaned = text
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[|—–_:/]/g, ' ')
    .trim();

  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const bengaliChars = (cleaned.match(/[\u0980-\u09FF]/g) || []).length;
  if (englishChars > bengaliChars && englishChars > 3) {
    return cleaned
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 45);
  }

  const vowels = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou'
  };

  const kar = {
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
    'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou'
  };

  const consonants = {
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n'
  };

  let result = '';
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (char === 'ব' && nextChar === 'ই') {
      result += 'boi';
      i++;
      continue;
    }

    if (char === '্') {
      if (nextChar === 'য') {
        result += 'y';
        i++;
      }
      continue;
    }

    if (vowels[char]) {
      result += vowels[char];
    } else if (kar[char]) {
      result += kar[char];
    } else if (consonants[char]) {
      result += consonants[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase();
    } else if (/\s|[-]/.test(char)) {
      if (!result.endsWith('-')) result += '-';
    }
  }

  const slug = result
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);

  return slug || 'book';
}

function generateSlug(title, id, englishName) {
  const baseTitle = englishName || title || 'book';
  const titleSlug = transliterateBengali(baseTitle);

  // Clean the id to make the url look like: boi-er-naam-123
  // If id is "book-sp-1791529667297-240", take the end "240" or stable suffix
  let idSuffix = id;
  if (id.startsWith('book-sp-')) {
    idSuffix = id.replace('book-sp-', '');
  } else if (id.startsWith('book-scraped-')) {
    idSuffix = id.replace('book-scraped-', '');
  } else if (id.startsWith('sp-book-')) {
    idSuffix = id.replace('sp-book-', '');
  } else if (id.startsWith('bb-book-')) {
    idSuffix = id.replace('bb-book-', '');
  }

  // Sanitize idSuffix
  idSuffix = idSuffix.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  return `${titleSlug}-${idSuffix}`;
}

async function run() {
  const { data: books, error } = await sb.from('books').select('id, title, english_name, slug');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Checking ${books.length} books in database...`);
  const usedSlugs = new Set();
  const updates = [];

  for (const b of books) {
    let slug = b.slug;
    if (!slug) {
      slug = generateSlug(b.title, b.id, b.english_name);
    }
    // Ensure uniqueness across the catalog
    let uniqueSlug = slug;
    let counter = 1;
    while (usedSlugs.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }
    usedSlugs.add(uniqueSlug);

    updates.push({ id: b.id, title: b.title, slug: uniqueSlug });
  }

  console.log('Sample generated slugs:');
  updates.slice(0, 15).forEach((u) => {
    console.log(`  [${u.id}] "${u.title}" => ${u.slug}`);
  });

  // Perform updates
  let updatedCount = 0;
  for (const u of updates) {
    const { error: updErr } = await sb.from('books').update({ slug: u.slug }).eq('id', u.id);
    if (updErr) {
      console.error(`Failed to update ${u.id}:`, updErr);
    } else {
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} / ${updates.length} books with unique slugs!`);
}

run();
