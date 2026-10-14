import { Book } from '../types';
import { formatPrice } from './formatters';

const DEFAULT_BASE_URL = 'https://shesherpata.com';

/**
 * Phonetically transliterate Bengali and mixed text into clean, URL-friendly Latin characters.
 */
export function transliterateBengaliToSlug(text: string): string {
  if (!text) return '';

  // Remove parenthetical details like "(হার্ডকভার)" or edition notes
  const cleaned = text
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[|—–_:/\\#?&]/g, ' ')
    .trim();

  // If text is primarily English, slugify directly
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const bengaliChars = (cleaned.match(/[\u0980-\u09FF]/g) || []).length;
  if (englishChars > bengaliChars && englishChars >= 3) {
    return cleaned
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }

  const vowels: Record<string, string> = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou'
  };

  const kar: Record<string, string> = {
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
    'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou'
  };

  const consonants: Record<string, string> = {
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
    .slice(0, 50);

  return slug || 'book';
}

/**
 * Generate a deterministic, stable unique slug from a book's title and unique ID.
 * Follows the format: boi-er-naam-123
 */
export function generateBookSlug(title: string, id: string, englishName?: string): string {
  const baseTitle = englishName || title || 'book';
  const titleSlug = transliterateBengaliToSlug(baseTitle);

  let idSuffix = String(id || '').trim();
  if (idSuffix.startsWith('book-sp-')) {
    idSuffix = idSuffix.replace('book-sp-', '');
  } else if (idSuffix.startsWith('book-scraped-')) {
    idSuffix = idSuffix.replace('book-scraped-', '');
  } else if (idSuffix.startsWith('sp-book-')) {
    idSuffix = idSuffix.replace('sp-book-', '');
  } else if (idSuffix.startsWith('bb-book-')) {
    idSuffix = idSuffix.replace('bb-book-', '');
  }

  idSuffix = idSuffix.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  return `${titleSlug}-${idSuffix || id}`;
}

/**
 * Get the permanent slug for a book.
 * If the book already has a persisted slug, returns it.
 * Otherwise, generates a stable slug deterministically.
 */
export function getBookSlug(book: { id: string; slug?: string; title?: string; english_name?: string }): string {
  if (book.slug && book.slug.trim()) {
    return book.slug.trim();
  }
  return generateBookSlug(book.title || '', book.id, book.english_name);
}

/**
 * Get the absolute canonical URL for a book.
 * Always returns https://shesherpata.com/book/{slug}
 */
export function getBookUrl(
  book: { id: string; slug?: string; title?: string; english_name?: string },
  baseUrl?: string
): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const slug = getBookSlug(book);
  return `${base}/book/${encodeURIComponent(slug)}`;
}

/**
 * Generate standard WhatsApp sharing message format for an individual book:
 * 
 * 📚 বইয়ের নাম: [Actual Book Title]
 * ✍️ লেখক: [Actual Author Name]
 * 💰 মূল্য: [Actual Price]
 * 
 * বইটি দেখতে ভিজিট করুন:
 * [Unique URL of This Book]
 */
export function getBookShareMessage(book: Book, bookUrl: string): string {
  const priceDisplay = formatPrice(book.price);
  return `📚 বইয়ের নাম: ${book.title}\n✍️ লেখক: ${book.author}\n💰 মূল্য: ${priceDisplay}\n\nবইটি দেখতে ভিজিট করুন:\n${bookUrl}`;
}

/**
 * Build the official WhatsApp share URL for a specific book:
 * https://wa.me/?text=ENCODED_MESSAGE
 */
export function getWhatsAppShareUrl(book: Book, bookUrl: string): string {
  const message = getBookShareMessage(book, bookUrl);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
