import { Author } from '../types';

export const AUTHORS_STORAGE_KEY = 'shesher_pata_authors_v1';

export const authorService = {
  /**
   * Get cached authors from localStorage.
   */
  getCachedAuthors(initialAuthors: Author[]): Author[] {
    if (typeof window === 'undefined') return initialAuthors;
    try {
      const item = localStorage.getItem(AUTHORS_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((a) => ({
            ...a,
            image: a.image || a.image_url,
            image_url: a.image_url || a.image,
          }));
        }
      }
    } catch (e) {
      console.warn('[authorService] Error reading localStorage:', e);
    }
    return initialAuthors;
  },

  /**
   * Save authors to localStorage cache.
   */
  saveToCache(authors: Author[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(AUTHORS_STORAGE_KEY, JSON.stringify(authors));
    } catch (e) {
      console.error('[authorService] Failed to save authors to cache:', e);
    }
  },

  /**
   * Fetch authors from server API.
   */
  async fetchAuthors(fallback: Author[]): Promise<Author[]> {
    const cached = this.getCachedAuthors(fallback);
    try {
      const response = await fetch('/api/admin/authors');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.authors)) {
          this.saveToCache(data.authors);
          return data.authors;
        }
      }
    } catch (err) {
      console.warn('[authorService] Error fetching remote authors:', err);
    }
    return cached;
  },

  /**
   * Update author by exact ID in database and state.
   */
  async updateAuthor(id: string, updates: Partial<Author>): Promise<Author> {
    const response = await fetch(`/api/admin/authors?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: লেখক পরিবর্তনের জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || `লেখক আপডেট ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const resData = await response.json();
    return resData.author;
  },

  /**
   * Create author in database.
   */
  async addAuthor(author: Author): Promise<Author> {
    const response = await fetch('/api/admin/authors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(author),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: লেখক তৈরির জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || `লেখক তৈরি ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const resData = await response.json();
    return resData.author;
  },

  /**
   * Delete author by ID.
   */
  async deleteAuthor(id: string): Promise<boolean> {
    const response = await fetch(`/api/admin/authors?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return response.ok;
  },
};
