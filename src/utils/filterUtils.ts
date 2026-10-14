import type { Category, Author } from '../types';

/**
 * Standardize Bengali and mixed unicode text to NFC format,
 * removing redundant whitespace and unifying decomposed nuktas (e.g. য় vs য+়, ড় vs ড+়).
 */
export function normalizeBengali(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .normalize('NFC')
    .trim();
}

/**
 * Known canonical categories with standard DB names, IDs, English names, and common aliases.
 */
export interface CategoryDefinition {
  id: string;
  name: string;
  englishName: string;
  aliases: string[];
}

export const CANONICAL_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'novel',
    name: 'উপন্যাস',
    englishName: 'Novels',
    aliases: ['উপন্যাস', 'novel', 'novels'],
  },
  {
    id: 'thriller',
    name: 'থ্রিলার ও রহস্য',
    englishName: 'Thriller & Mystery',
    aliases: ['থ্রিলার ও রহস্য', 'গোয়েন্দা ও থ্রিলার', 'থ্রিলার', 'গোয়েন্দা', 'রহস্য', 'thriller', 'mystery'],
  },
  {
    id: 'islamic',
    name: 'ইসলামিক সাহিত্য',
    englishName: 'Islamic Literature',
    aliases: ['ইসলামিক সাহিত্য', 'ইসলামিক বই', 'ইসলামিক', 'ইসলামী সাহিত্য', 'islamic', 'islam'],
  },
  {
    id: 'children',
    name: 'শিশু-কিশোর',
    englishName: 'Children & Teens',
    aliases: ['শিশু-কিশোর', 'কিশোর সাহিত্য', 'শিশু কিশোর', 'কিশোর', 'শিশু', 'children', 'teens'],
  },
  {
    id: 'poetry',
    name: 'কবিতা',
    englishName: 'Poetry',
    aliases: ['কবিতা', 'কবিতা ও সাহিত্য', 'poetry'],
  },
  {
    id: 'story',
    name: 'গল্প ও সাহিত্য',
    englishName: 'Short Stories',
    aliases: ['গল্প ও সাহিত্য', 'ছোটগল্প', 'গল্প', 'story', 'stories'],
  },
  {
    id: 'self-help',
    name: 'আত্মউন্নয়ন',
    englishName: 'Self Help & Motivation',
    aliases: ['আত্মউন্নয়ন', 'আত্মউন্নয়ন', 'self-help', 'motivation'],
  },
  {
    id: 'history',
    name: 'ইতিহাস ও ঐতিহ্য',
    englishName: 'History & Culture',
    aliases: ['ইতিহাস ও ঐতিহ্য', 'ইতিহাস', 'ঐতিহ্য', 'history'],
  },
  {
    id: 'scifi',
    name: 'সায়েন্স ফিকশন',
    englishName: 'Sci-Fi & Fantasy',
    aliases: ['সায়েন্স ফিকশন', 'সায়েন্স ফিকশন', 'কল্পবিজ্ঞান', 'scifi', 'sci-fi'],
  },
  {
    id: 'english',
    name: 'ইংরেজি ও অনুবাদ',
    englishName: 'English & Translations',
    aliases: ['ইংরেজি ও অনুবাদ', 'বিদেশি বই', 'অনুবাদ সাহিত্য', 'অনুবাদ', 'ইংরেজি', 'english', 'translation'],
  },
  {
    id: 'academic',
    name: 'একাডেমিক ও ক্যারিয়ার',
    englishName: 'Academic & Career',
    aliases: ['একাডেমিক ও ক্যারিয়ার', 'একাডেমিক বই', 'একাডেমিক', 'academic', 'career'],
  },
  {
    id: 'package',
    name: 'স্পেশাল প্যাকেজ',
    englishName: 'Special Bundles',
    aliases: ['স্পেশাল প্যাকেজ', 'প্যাকেজ অফার', 'প্যাকেজ', 'package', 'bundle'],
  },
];

/**
 * Check if a category identifier or string represents "all books" / "all categories".
 */
export function isAllCategory(category: string | undefined | null): boolean {
  if (!category) return true;
  const norm = normalizeBengali(category).trim().toLowerCase();
  return (
    norm === '' ||
    norm === 'all' ||
    norm === 'all-books' ||
    norm === 'all_books' ||
    norm === 'books' ||
    norm === 'সকল বই' ||
    norm === 'সব বই' ||
    norm === 'সকল' ||
    norm === 'সব' ||
    norm === 'সকল ক্যাটাগরি' ||
    norm === 'সব ক্যাটাগরি'
  );
}

/**
 * Resolve any category identifier (ID, English name, Bengali name, alias)
 * to its canonical ID (e.g. 'স্পেশাল প্যাকেজ' -> 'package', 'Special Bundles' -> 'package').
 */
export function getCanonicalCategoryId(
  categoryIdOrName: string | undefined | null,
  dynamicCategories?: Category[]
): string | null {
  if (!categoryIdOrName || isAllCategory(categoryIdOrName)) return null;

  const norm = normalizeBengali(categoryIdOrName).toLowerCase();

  // 1. Check canonical definition list
  const canonical = CANONICAL_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === norm ||
      normalizeBengali(c.name).toLowerCase() === norm ||
      c.englishName.toLowerCase() === norm ||
      c.aliases.some((a) => normalizeBengali(a).toLowerCase() === norm)
  );
  if (canonical) return canonical.id;

  // 2. Check dynamic categories from database
  if (dynamicCategories && dynamicCategories.length > 0) {
    const dyn = dynamicCategories.find(
      (c) =>
        c.id.toLowerCase() === norm ||
        normalizeBengali(c.name).toLowerCase() === norm ||
        (c.englishName && c.englishName.toLowerCase() === norm) ||
        (c.english_name && c.english_name.toLowerCase() === norm)
    );
    if (dyn) return dyn.id;
  }

  return norm;
}

/**
 * Check if a book's category or tags match a filter category.
 * Filter category can be an ID ('thriller', 'package'), a canonical Bengali name ('স্পেশাল প্যাকেজ'),
 * an English name ('Special Bundles'), or an alias ('প্যাকেজ অফার').
 */
export function matchesCategory(
  bookCategory: string | undefined | null,
  filterCategory: string | undefined | null
): boolean;
export function matchesCategory(
  bookCategory: string | undefined | null,
  bookTags: string[] | undefined | null,
  filterCategory: string | undefined | null,
  dynamicCategories?: Category[]
): boolean;
export function matchesCategory(
  bookCategory: string | undefined | null,
  arg2?: string[] | string | null,
  arg3?: string | Category[] | null,
  arg4?: Category[]
): boolean {
  let bookTags: string[] | undefined | null;
  let filterCategory: string | undefined | null;
  let dynamicCategories: Category[] | undefined;

  if (Array.isArray(arg2)) {
    bookTags = arg2;
    filterCategory = typeof arg3 === 'string' ? arg3 : undefined;
    dynamicCategories = Array.isArray(arg4) ? arg4 : undefined;
  } else if (typeof arg2 === 'string') {
    bookTags = [];
    filterCategory = arg2;
    dynamicCategories = Array.isArray(arg3) ? (arg3 as Category[]) : undefined;
  } else {
    bookTags = [];
    filterCategory = typeof arg3 === 'string' ? arg3 : undefined;
    dynamicCategories = Array.isArray(arg4) ? arg4 : undefined;
  }

  if (!filterCategory || isAllCategory(filterCategory)) return true;

  const normFilter = normalizeBengali(filterCategory).toLowerCase();
  const normBookCat = normalizeBengali(bookCategory).toLowerCase();
  const normTags = (bookTags || []).map((t) => normalizeBengali(t).toLowerCase());

  // 1. Direct exact match
  if (normBookCat && normBookCat === normFilter) {
    return true;
  }

  // 2. Bidirectional canonical resolution: if both resolve to the same canonical category ID
  const filterCanonicalId = getCanonicalCategoryId(filterCategory, dynamicCategories);
  const bookCanonicalId = getCanonicalCategoryId(bookCategory, dynamicCategories);
  if (filterCanonicalId && bookCanonicalId && filterCanonicalId === bookCanonicalId) {
    return true;
  }

  // 3. Direct substring match (e.g. 'উপন্যাস' in 'চিরায়ত উপন্যাস')
  if (normBookCat && (normBookCat.includes(normFilter) || normFilter.includes(normBookCat))) {
    return true;
  }

  // 4. Direct match against tags
  if (normTags.some((t) => t === normFilter || t.includes(normFilter) || normFilter.includes(t))) {
    return true;
  }

  // 5. Match tags against canonical filter ID
  if (filterCanonicalId && normTags.some((t) => {
    const tagCanonicalId = getCanonicalCategoryId(t, dynamicCategories);
    return tagCanonicalId === filterCanonicalId;
  })) {
    return true;
  }

  // 6. Resolve canonical definition for filter and check candidate names
  const foundDef = CANONICAL_CATEGORIES.find((def) => {
    if (def.id.toLowerCase() === normFilter) return true;
    if (normalizeBengali(def.name).toLowerCase() === normFilter) return true;
    if (def.englishName.toLowerCase() === normFilter) return true;
    return def.aliases.some((alias) => normalizeBengali(alias).toLowerCase() === normFilter);
  });

  // Also check dynamic categories from database
  let dynamicDef: Category | undefined;
  if (dynamicCategories && dynamicCategories.length > 0) {
    dynamicDef = dynamicCategories.find((cat) => {
      if (cat.id.toLowerCase() === normFilter) return true;
      if (normalizeBengali(cat.name).toLowerCase() === normFilter) return true;
      if (cat.englishName && cat.englishName.toLowerCase() === normFilter) return true;
      if (cat.english_name && cat.english_name.toLowerCase() === normFilter) return true;
      return false;
    });
  }

  const candidateNames = new Set<string>();
  if (foundDef) {
    candidateNames.add(normalizeBengali(foundDef.name).toLowerCase());
    foundDef.aliases.forEach((a) => candidateNames.add(normalizeBengali(a).toLowerCase()));
  }
  if (dynamicDef) {
    candidateNames.add(normalizeBengali(dynamicDef.name).toLowerCase());
    if (dynamicDef.englishName) candidateNames.add(dynamicDef.englishName.toLowerCase());
    if (dynamicDef.english_name) candidateNames.add(dynamicDef.english_name.toLowerCase());
  }

  if (candidateNames.size > 0) {
    for (const name of candidateNames) {
      if (normBookCat && (normBookCat === name || normBookCat.includes(name) || name.includes(normBookCat))) {
        return true;
      }
      if (normTags.some((t) => t === name || t.includes(name) || name.includes(t))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get human-friendly Bengali display name for a category identifier.
 */
export function getCategoryDisplayName(
  categoryIdOrName: string | undefined | null,
  dynamicCategories?: Category[]
): string {
  if (!categoryIdOrName || isAllCategory(categoryIdOrName)) return 'সকল বই';

  const norm = normalizeBengali(categoryIdOrName).toLowerCase();

  // 1. Check canonical definitions by id, name, englishName, or aliases
  const foundCanonical = CANONICAL_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === norm ||
      normalizeBengali(c.name).toLowerCase() === norm ||
      c.englishName.toLowerCase() === norm ||
      c.aliases.some((a) => normalizeBengali(a).toLowerCase() === norm)
  );
  if (foundCanonical) return foundCanonical.name;

  // 2. Check dynamic categories
  if (dynamicCategories && dynamicCategories.length > 0) {
    const foundDyn = dynamicCategories.find(
      (c) =>
        c.id.toLowerCase() === norm ||
        normalizeBengali(c.name).toLowerCase() === norm ||
        (c.englishName && c.englishName.toLowerCase() === norm) ||
        (c.english_name && c.english_name.toLowerCase() === norm)
    );
    if (foundDyn) return foundDyn.name;
  }

  return normalizeBengali(categoryIdOrName);
}

/**
 * Robust author comparison that handles Unicode NFC/NFD differences,
 * whitespace, casing, and author IDs.
 */
export function matchesAuthor(
  bookAuthor: string | undefined | null,
  filterAuthor: string | undefined | null
): boolean {
  if (!filterAuthor || filterAuthor === 'all') return true;
  if (!bookAuthor) return false;

  const normBook = normalizeBengali(bookAuthor).toLowerCase();
  const normFilter = normalizeBengali(filterAuthor).toLowerCase();

  if (!normBook || !normFilter) return false;

  // 1. Exact match under NFC
  if (normBook === normFilter) return true;

  // 2. Substring match (e.g. "হুমায়ূন আহমেদ" in "দেবী - হুমায়ূন আহমেদ")
  if (normBook.includes(normFilter) || normFilter.includes(normBook)) return true;

  // 3. Known author ID map (e.g. author-humayun -> হুমায়ূন আহমেদ)
  const authorIdMap: Record<string, string> = {
    'author-humayun': 'হুমায়ূন আহমেদ',
    'author-rabindranath': 'রবীন্দ্রনাথ ঠাকুর',
    'author-nazrul': 'কাজী নজরুল ইসলাম',
    'author-satyajit': 'সত্যজিৎ রায়',
    'author-sunil': 'সুনীল গঙ্গোপাধ্যায়',
    'author-sharat': 'শরৎচন্দ্র চট্টোপাধ্যায়',
    'author-zafar': 'মুহম্মদ জাফর ইকবাল',
  };

  if (authorIdMap[filterAuthor]) {
    const canonicalName = normalizeBengali(authorIdMap[filterAuthor]).toLowerCase();
    if (normBook === canonicalName || normBook.includes(canonicalName)) {
      return true;
    }
  }

  return false;
}
