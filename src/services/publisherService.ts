import { Publisher } from '../types';

export const PUBLISHERS_STORAGE_KEY = 'shesher_pata_publishers_v1';

export const publisherService = {
  /**
   * Get cached publishers from localStorage.
   */
  getCachedPublishers(initialPublishers: Publisher[]): Publisher[] {
    if (typeof window === 'undefined') return initialPublishers;
    try {
      const item = localStorage.getItem(PUBLISHERS_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[publisherService] Error reading localStorage:', e);
    }
    return initialPublishers;
  },

  /**
   * Save publishers to localStorage cache.
   */
  saveToCache(publishers: Publisher[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PUBLISHERS_STORAGE_KEY, JSON.stringify(publishers));
    } catch (e) {
      console.error('[publisherService] Failed to save publishers to cache:', e);
    }
  },

  /**
   * Fetch publishers from server API (with fallback to cache).
   */
  async fetchPublishers(fallback: Publisher[]): Promise<Publisher[]> {
    const cached = this.getCachedPublishers(fallback);
    try {
      const response = await fetch('/api/admin/publishers');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.publishers)) {
          this.saveToCache(data.publishers);
          return data.publishers;
        }
      }
    } catch (err) {
      console.warn('[publisherService] Error fetching remote publishers:', err);
    }
    return cached;
  },
};
