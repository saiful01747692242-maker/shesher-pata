import { Book } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BOOKS as INITIAL_BOOKS } from '../data/books';
import { normalizeBengali } from '../utils/filterUtils';
import { generateBookSlug } from '../utils/bookUrl';

export const BOOKS_STORAGE_KEY = 'shesher_pata_books_v1';
export const BOOKS_CHANGED_EVENT = 'shesher_pata_books_changed';

/**
 * Convert database row to frontend Book model.
 * Handles both snake_case and camelCase, as well as field aliases.
 */
export function rowToBook(row: any): Book {
  const banglaName = row.bangla_name || row.title_bn || row.title || '';
  const englishName = row.english_name || '';
  const title = banglaName || englishName || row.title || '';

  const price = row.price !== undefined && row.price !== null ? Number(row.price) : 0;
  const originalPrice =
    row.original_price !== undefined && row.original_price !== null
      ? Number(row.original_price)
      : row.old_price !== undefined && row.old_price !== null
      ? Number(row.old_price)
      : price;

  const oldPrice =
    row.old_price !== undefined && row.old_price !== null
      ? Number(row.old_price)
      : originalPrice;

  let tagsArray: string[] = [];
  if (Array.isArray(row.tags)) {
    tagsArray = row.tags;
  } else if (typeof row.tags === 'string') {
    try {
      const parsed = JSON.parse(row.tags);
      tagsArray = Array.isArray(parsed) ? parsed : [row.tags];
    } catch {
      tagsArray = row.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
  }

  let sectionIdsArray: string[] = ['new-arrivals'];
  if (Array.isArray(row.section_ids)) {
    sectionIdsArray = row.section_ids;
  } else if (Array.isArray(row.sectionIds)) {
    sectionIdsArray = row.sectionIds;
  } else if (typeof row.section_ids === 'string') {
    try {
      const parsed = JSON.parse(row.section_ids);
      sectionIdsArray = Array.isArray(parsed) ? parsed : [row.section_ids];
    } catch {
      sectionIdsArray = [row.section_ids];
    }
  }

  let galleryArray: string[] = [];
  if (Array.isArray(row.gallery)) {
    galleryArray = row.gallery;
  } else if (typeof row.gallery === 'string') {
    try {
      const parsed = JSON.parse(row.gallery);
      if (Array.isArray(parsed)) galleryArray = parsed;
    } catch {
      // ignore
    }
  }

  return {
    id: String(row.id),
    slug: row.slug || undefined,
    title,
    title_bn: banglaName,
    bangla_name: banglaName,
    english_name: englishName,
    author: normalizeBengali(row.author || ''),
    publisher: normalizeBengali(row.publisher || 'বাতিঘর'),
    category: normalizeBengali(row.category || 'উপন্যাস'),
    description: row.description || '',
    description_bn: row.description_bn || row.description || '',
    image: row.image || row.cover_image || '',
    cover_image: row.cover_image || row.image || '',
    banner_image: row.banner_image || '',
    pdf_url: row.pdf_url || '',
    gallery: galleryArray,
    price,
    originalPrice,
    old_price: oldPrice,
    discount: row.discount !== undefined && row.discount !== null ? Number(row.discount) : 0,
    rating: row.rating !== undefined && row.rating !== null ? Number(row.rating) : 5.0,
    reviewCount:
      row.review_count !== undefined && row.review_count !== null
        ? Number(row.review_count)
        : row.reviewCount || 0,
    stock: row.stock !== undefined && row.stock !== null ? Number(row.stock) : 0,
    isbn: row.isbn || '',
    pages: row.pages !== undefined && row.pages !== null ? Number(row.pages) : 0,
    edition: row.edition || '১ম সংস্করণ',
    language: row.language || 'বাংলা',
    tags: tagsArray,
    isBestseller: Boolean(row.is_bestseller ?? row.isBestseller),
    isNew: Boolean(row.is_new ?? row.isNew),
    isNewRelease: Boolean(row.is_new_release ?? row.isNewRelease),
    isFeatured: Boolean(row.is_featured ?? row.featured ?? row.isFeatured),
    featured: Boolean(row.featured ?? row.is_featured ?? row.isFeatured),
    isInternational: Boolean(row.is_international ?? row.isInternational),
    is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
    status: (row.status as any) || 'published',
    sectionIds: sectionIdsArray,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export interface BulkImportResult {
  success: boolean;
  total: number;
  imported: number;
  updated: number;
  failed: number;
  failedRecords: Array<{ index: number; title: string; reason: string }>;
  message: string;
  books?: Book[];
}

/**
 * Convert frontend Book or raw JSON to database row payload.
 * Handles both camelCase and snake_case properties robustly.
 * Ensures each created object is strictly independent (no shared image/property references).
 */
export function bookToRow(book: Partial<Book> | Record<string, any>): Record<string, any> {
  const banglaName = String(book.bangla_name || book.title_bn || book.title || '').trim();
  const englishName = String(book.english_name || '').trim();
  const title = banglaName || englishName || String(book.title || '').trim();

  const price = book.price !== undefined && book.price !== null ? Number(book.price) : 0;
  
  const rawOriginal =
    book.originalPrice !== undefined && book.originalPrice !== null
      ? book.originalPrice
      : (book as any).original_price !== undefined && (book as any).original_price !== null
      ? (book as any).original_price
      : (book as any).old_price !== undefined && (book as any).old_price !== null
      ? (book as any).old_price
      : price;
  const originalPrice = Number(rawOriginal) || price;

  const rawOld =
    (book as any).old_price !== undefined && (book as any).old_price !== null
      ? (book as any).old_price
      : originalPrice;
  const oldPrice = Number(rawOld) || originalPrice;

  // Individual image and cover_image references: each book strictly has its own values
  const imageVal = typeof book.image === 'string' ? book.image.trim() : '';
  const coverImageVal = typeof (book as any).cover_image === 'string' ? (book as any).cover_image.trim() : '';
  const finalImage = imageVal || coverImageVal || '';
  const finalCoverImage = coverImageVal || imageVal || '';

  // Gallery
  let galleryArray: string[] = [];
  if (Array.isArray(book.gallery)) {
    galleryArray = [...book.gallery];
  } else if (typeof book.gallery === 'string') {
    try {
      const parsed = JSON.parse(book.gallery);
      if (Array.isArray(parsed)) galleryArray = parsed;
    } catch {}
  }

  // Tags
  let tagsArray: string[] = [];
  if (Array.isArray(book.tags)) {
    tagsArray = [...book.tags];
  } else if (typeof book.tags === 'string') {
    try {
      const parsed = JSON.parse(book.tags);
      tagsArray = Array.isArray(parsed) ? parsed : [book.tags];
    } catch {
      tagsArray = book.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
  }

  // Section IDs
  let sectionIdsArray: string[] = ['new-arrivals'];
  const rawSections = book.sectionIds || (book as any).section_ids;
  if (Array.isArray(rawSections)) {
    sectionIdsArray = [...rawSections];
  } else if (typeof rawSections === 'string') {
    try {
      const parsed = JSON.parse(rawSections);
      sectionIdsArray = Array.isArray(parsed) ? parsed : [rawSections];
    } catch {
      sectionIdsArray = [rawSections];
    }
  }

  const reviewCount =
    book.reviewCount !== undefined && book.reviewCount !== null
      ? Number(book.reviewCount)
      : (book as any).review_count !== undefined && (book as any).review_count !== null
      ? Number((book as any).review_count)
      : 0;

  const row: Record<string, any> = {
    title,
    title_bn: banglaName,
    bangla_name: banglaName,
    english_name: englishName,
    author: normalizeBengali(String(book.author || '')),
    publisher: normalizeBengali(String(book.publisher || 'বাতিঘর')),
    category: normalizeBengali(String(book.category || 'উপন্যাস')),
    description: String(book.description || (book as any).description_bn || ''),
    description_bn: String((book as any).description_bn || book.description || ''),
    image: finalImage,
    cover_image: finalCoverImage,
    banner_image: String((book as any).banner_image || ''),
    pdf_url: String((book as any).pdf_url || ''),
    gallery: galleryArray,
    price,
    original_price: originalPrice,
    old_price: oldPrice,
    discount: book.discount !== undefined && book.discount !== null ? Number(book.discount) : 0,
    rating: book.rating !== undefined && book.rating !== null ? Number(book.rating) : 5.0,
    review_count: reviewCount,
    stock: book.stock !== undefined && book.stock !== null ? Math.max(0, Number(book.stock)) : 0,
    isbn: String(book.isbn || '').trim(),
    pages: book.pages !== undefined && book.pages !== null ? Number(book.pages) : 0,
    edition: String(book.edition || '১ম সংস্করণ'),
    language: String(book.language || 'বাংলা'),
    tags: tagsArray,
    is_bestseller: Boolean(book.isBestseller ?? (book as any).is_bestseller),
    is_new: Boolean(book.isNew ?? (book as any).is_new),
    is_new_release: Boolean(book.isNewRelease ?? (book as any).is_new_release),
    is_featured: Boolean(book.isFeatured ?? book.featured ?? (book as any).is_featured),
    featured: Boolean(book.featured ?? book.isFeatured ?? (book as any).is_featured),
    is_international: Boolean(book.isInternational ?? (book as any).is_international),
    is_active: book.is_active !== undefined ? Boolean(book.is_active) : true,
    status: book.status || 'published',
    section_ids: sectionIdsArray,
    updated_at: new Date().toISOString(),
  };

  if (book.slug) {
    row.slug = String(book.slug).trim();
  } else if (title) {
    row.slug = generateBookSlug(title, String(book.id || row.id || Date.now()), englishName);
  }

  if (book.id) {
    row.id = String(book.id).trim();
  }
  if (book.created_at) {
    row.created_at = book.created_at;
  }

  return row;
}

/**
 * Convert partial Book updates to database row payload,
 * only including fields explicitly specified to prevent overwriting existing columns.
 */
export function bookToRowPartial(book: Partial<Book>): Record<string, any> {
  const row: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (book.slug !== undefined) row.slug = book.slug;

  if (book.title !== undefined || book.bangla_name !== undefined || book.title_bn !== undefined) {
    const titleVal = normalizeBengali((book.bangla_name || book.title_bn || book.title || ''));
    if (titleVal) {
      row.title = titleVal;
      row.title_bn = titleVal;
      row.bangla_name = titleVal;
    }
  }
  if (book.english_name !== undefined) row.english_name = book.english_name.trim();
  if (book.author !== undefined) row.author = normalizeBengali(book.author);
  if (book.publisher !== undefined) row.publisher = normalizeBengali(book.publisher);
  if (book.category !== undefined) row.category = normalizeBengali(book.category);
  if (book.description !== undefined) row.description = book.description;
  if (book.description_bn !== undefined) row.description_bn = book.description_bn;
  if (book.image !== undefined) {
    row.image = book.image;
    if (book.cover_image === undefined) {
      row.cover_image = book.image;
    }
  }
  if (book.cover_image !== undefined) {
    row.cover_image = book.cover_image;
    if (book.image === undefined) {
      row.image = book.cover_image;
    }
  }
  if (book.banner_image !== undefined) row.banner_image = book.banner_image;
  if (book.pdf_url !== undefined) row.pdf_url = book.pdf_url;
  if (book.gallery !== undefined) row.gallery = Array.isArray(book.gallery) ? book.gallery : [];
  if (book.price !== undefined) row.price = Number(book.price);
  if (book.originalPrice !== undefined) row.original_price = Number(book.originalPrice);
  if (book.old_price !== undefined) row.old_price = Number(book.old_price);
  if (book.discount !== undefined) row.discount = Number(book.discount);
  if (book.rating !== undefined) row.rating = Number(book.rating);
  if (book.reviewCount !== undefined) row.review_count = Number(book.reviewCount);
  if (book.stock !== undefined) row.stock = Number(book.stock);
  if (book.isbn !== undefined) row.isbn = book.isbn;
  if (book.pages !== undefined) row.pages = Number(book.pages);
  if (book.edition !== undefined) row.edition = book.edition;
  if (book.language !== undefined) row.language = book.language;
  if (book.tags !== undefined) row.tags = Array.isArray(book.tags) ? book.tags : [];
  if (book.isBestseller !== undefined) row.is_bestseller = Boolean(book.isBestseller);
  if (book.isNew !== undefined) row.is_new = Boolean(book.isNew);
  if (book.isNewRelease !== undefined) row.is_new_release = Boolean(book.isNewRelease);
  if (book.isFeatured !== undefined || book.featured !== undefined) {
    const feat = Boolean(book.isFeatured ?? book.featured);
    row.is_featured = feat;
    row.featured = feat;
  }
  if (book.isInternational !== undefined) row.is_international = Boolean(book.isInternational);
  if (book.is_active !== undefined) row.is_active = Boolean(book.is_active);
  if (book.status !== undefined) row.status = book.status;
  if (book.sectionIds !== undefined) row.section_ids = Array.isArray(book.sectionIds) ? book.sectionIds : [];

  return row;
}

export const bookService = {
  /**
   * Get cached books from localStorage for immediate, zero-latency rendering.
   */
  getCachedBooks(): Book[] {
    if (typeof window === 'undefined') {
      return INITIAL_BOOKS;
    }
    try {
      const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore read errors
    }
    return INITIAL_BOOKS;
  },

  /**
   * Save books to localStorage cache and notify any listeners in the same window/tabs.
   */
  saveToCache(books: Book[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
      window.dispatchEvent(
        new CustomEvent(BOOKS_CHANGED_EVENT, { detail: books })
      );
    } catch (e) {
      console.error('[bookService] Failed to cache books in localStorage:', e);
    }
  },

  /**
   * Fetch all books from central database.
   * Priority: 1) /api/books server route (bypasses adblockers) -> 2) Direct Supabase -> 3) Local cache.
   */
  async fetchBooks(): Promise<Book[]> {
    const cached = this.getCachedBooks();

    // 1. Try Next.js server route /api/books
    try {
      const response = await fetch('/api/books', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.books)) {
          const mappedBooks = json.books.map(rowToBook);
          this.saveToCache(mappedBooks);
          return mappedBooks;
        }
      }
    } catch (apiErr) {
      console.warn('[bookService] /api/books fetch error, trying direct Supabase:', apiErr);
    }

    // 2. Direct Supabase client query
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          const mappedBooks = data.map(rowToBook);
          this.saveToCache(mappedBooks);
          return mappedBooks;
        }
      } catch (err) {
        console.warn('[bookService] Exception querying Supabase books directly:', err);
      }
    }

    return cached;
  },

  /**
   * Fetch a single book by ID from Supabase.
   */
  async getBookById(idOrSlug: string): Promise<Book | null> {
    if (!idOrSlug) return null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
          .maybeSingle();

        if (!error) {
          if (data) return rowToBook(data);
          // Explicitly not found in central database (deleted)
          return null;
        }
      } catch (err) {
        console.warn(`[bookService] Exception fetching book ${idOrSlug}:`, err);
      }
    }

    // Fallback: search local cache if offline
    const cached = this.getCachedBooks();
    return cached.find((b) => b.id === idOrSlug || b.slug === idOrSlug) || null;
  },

  /**
   * Create a new book.
   * Sends the request to the secure server API route /api/admin/books
   * which verifies admin credentials and inserts into Supabase.
   */
  async createBook(bookData: Omit<Book, 'id'> & { id?: string }): Promise<Book> {
    const id = bookData.id || `book-sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullBook: Book = {
      ...bookData,
      id,
      title: normalizeBengali(bookData.title || bookData.bangla_name || bookData.english_name || ''),
      bangla_name: normalizeBengali(bookData.bangla_name || bookData.title || ''),
      english_name: bookData.english_name || '',
      author: normalizeBengali(bookData.author || ''),
      publisher: normalizeBengali(bookData.publisher || 'বাতিঘর'),
      category: normalizeBengali(bookData.category || 'উপন্যাস'),
      image: bookData.image || bookData.cover_image || '',
      cover_image: bookData.cover_image || bookData.image || '',
      price: Number(bookData.price) || 0,
      originalPrice: Number(bookData.originalPrice) || Number(bookData.price) || 0,
      discount: Number(bookData.discount) || 0,
      stock: Number(bookData.stock) || 0,
      rating: bookData.rating !== undefined ? Number(bookData.rating) : 5.0,
      reviewCount: bookData.reviewCount !== undefined ? Number(bookData.reviewCount) : 1,
      tags: Array.isArray(bookData.tags) ? bookData.tags : [],
      sectionIds: Array.isArray(bookData.sectionIds) ? bookData.sectionIds : ['new-arrivals'],
      created_at: bookData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const response = await fetch('/api/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullBook),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: বই আপলোড করার জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || `বই সংরক্ষণে সমস্যা হয়েছে (Status: ${response.status})`);
    }

    const resData = await response.json();
    if (resData.book) {
      return rowToBook(resData.book);
    }

    return fullBook;
  },

  /**
   * Update an existing book by ID.
   */
  async updateBook(id: string, updates: Partial<Book>): Promise<Book> {
    const payload = { ...updates };
    if (payload.image !== undefined && payload.cover_image === undefined) {
      payload.cover_image = payload.image;
    } else if (payload.cover_image !== undefined && payload.image === undefined) {
      payload.image = payload.cover_image;
    }

    const response = await fetch(`/api/admin/books?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: বই এডিট করার জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || `বই আপডেট ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const resData = await response.json();
    if (resData.book) {
      return rowToBook(resData.book);
    }

    const current = this.getCachedBooks().find((b) => b.id === id);
    return {
      ...(current || ({} as Book)),
      ...updates,
      id,
      updated_at: new Date().toISOString(),
    } as Book;
  },

  /**
   * Delete a book by ID.
   */
  async deleteBook(id: string): Promise<boolean> {
    const response = await fetch(`/api/admin/books?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: বই মুছে ফেলার জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || `বই মুছে ফেলা সম্ভব হয়নি (Status: ${response.status})`);
    }

    return true;
  },

  /**
   * Upload an image file to Supabase Storage bucket ('book-covers' or 'book-banners').
   */
  async uploadImage(
    file: File,
    bucket = 'book-covers',
    options?: { folder?: string; recordId?: string; type?: 'category' | 'author' | 'book' | 'banner' }
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    if (options?.folder) formData.append('folder', options.folder);
    if (options?.recordId) formData.append('recordId', options.recordId);
    if (options?.type) formData.append('type', options.type);

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: ছবি আপলোডের জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || 'ছবি আপলোড ব্যর্থ হয়েছে');
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error('সার্ভার থেকে ছবির লিঙ্ক পাওয়া যায়নি');
    }

    return data.url;
  },

  /**
   * Subscribe to Supabase Realtime changes on public.books.
   * Calls onInsert, onUpdate, onDelete callbacks as events arrive.
   */
  subscribeToRealtime(callbacks: {
    onInsert?: (book: Book) => void;
    onUpdate?: (book: Book) => void;
    onDelete?: (id: string) => void;
  }): () => void {
    if (!isSupabaseConfigured() || !supabase) {
      return () => {};
    }

    try {
      const channel = supabase
        .channel(`realtime-books-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'books' },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const book = rowToBook(payload.new);
              callbacks.onInsert?.(book);
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const book = rowToBook(payload.new);
              callbacks.onUpdate?.(book);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const deletedId = String((payload.old as any).id);
              callbacks.onDelete?.(deletedId);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Channel ready
          }
        });

      return () => {
        try {
          supabase?.removeChannel(channel);
        } catch (e) {
          console.warn('[bookService] Error removing realtime channel:', e);
        }
      };
    } catch (err) {
      console.warn('[bookService] Failed to initialize realtime subscription:', err);
      return () => {};
    }
  },
  /**
   * Bulk import or restore books via the secure server API route /api/admin/books/import.
   * Sends records to server for validation, duplicate resolution, batching and Supabase upsert.
   */
  async bulkImportBooks(input: any[] | { books?: any[] } | Record<string, any>): Promise<BulkImportResult> {
    const payload = Array.isArray(input) ? { books: input } : input;

    const response = await fetch('/api/admin/books/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('অননুমোদিত: বই ইমপোর্ট করার জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(data.error || `বই ইমপোর্ট ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    return data as BulkImportResult;
  },
};

