import { Category } from '../types';
import { CATEGORIES as INITIAL_CATEGORIES } from '../data/categories';

export const CATEGORIES_STORAGE_KEY = 'shesher_pata_categories_v1';

export const categoryService = {
  /**
   * Get cached categories from localStorage or fallback to INITIAL_CATEGORIES.
   */
  getCachedCategories(): Category[] {
    if (typeof window === 'undefined') return INITIAL_CATEGORIES;
    try {
      const item = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c) => ({
            ...c,
            image: c.image || c.imageUrl,
            imageUrl: c.imageUrl || c.image,
          }));
        }
      }
    } catch (e) {
      console.warn('[categoryService] Error reading localStorage:', e);
    }
    return INITIAL_CATEGORIES;
  },

  /**
   * Save categories to localStorage cache.
   */
  saveToCache(categories: Category[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('[categoryService] Failed to save categories to cache:', e);
    }
  },

  /**
   * Fetch categories from server API.
   */
  async fetchCategories(): Promise<Category[]> {
    const cached = this.getCachedCategories();
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.categories)) {
          this.saveToCache(data.categories);
          return data.categories;
        }
      }
    } catch (err) {
      console.warn('[categoryService] Error fetching remote categories:', err);
    }
    return cached;
  },

  /**
   * Update category by exact ID in database and state.
   */
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: ক্যাটাগরি পরিবর্তনের জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || `ক্যাটাগরি আপডেট ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const resData = await response.json();
    return resData.category;
  },

  /**
   * Create category in database.
   */
  async addCategory(category: Category): Promise<Category> {
    const response = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('অননুমোদিত: ক্যাটাগরি তৈরির জন্য অ্যাডমিন লগইন প্রয়োজন।');
      }
      throw new Error(errorData.error || `ক্যাটাগরি তৈরি ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const resData = await response.json();
    return resData.category;
  },

  /**
   * Delete category by ID.
   */
  async deleteCategory(id: string): Promise<boolean> {
    const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return response.ok;
  },
};
