function transliterateBengali(text) {
  if (!text) return '';

  // Clean parenthetical info like "(হার্ডকভার)" or subtitles
  let cleaned = text
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[|—–_:/]/g, ' ')
    .trim();

  // If already primarily english, slugify directly
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const bengaliChars = (cleaned.match(/[\u0980-\u09FF]/g) || []).length;
  if (englishChars > bengaliChars && englishChars > 3) {
    return cleaned
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }

  const vowels = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou'
  };

  const kar = {
    'া': 'a', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri',
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
      // Hasanta / conjunct
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
      const c = consonants[char];
      result += c;
      // If consonant is followed by another consonant or space or end, might need inherent vowel 'o' in some contexts, but simple phonetic works great
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
    .slice(0, 50);

  return slug || 'book';
}

console.log('বইয়ের নাম ->', transliterateBengali('বইয়ের নাম'));
console.log('অন্য বই ->', transliterateBengali('অন্য বই'));
console.log('আবে হায়াত (হার্ডকভার) ->', transliterateBengali('আবে হায়াত (হার্ডকভার)'));
console.log('দেবী - হুমায়ূন আহমেদ ->', transliterateBengali('দেবী - হুমায়ূন আহমেদ'));
console.log('The Alchemist ->', transliterateBengali('The Alchemist'));
console.log('শেষের কবিতা ->', transliterateBengali('শেষের কবিতা'));
console.log('মালিক ->', transliterateBengali('মালিক'));
