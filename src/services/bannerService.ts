import { Banner } from '../types';

export const BANNERS_STORAGE_KEY = 'shesher_pata_banners_v2';

export const bannerService = {
  /**
   * Get cached banners from localStorage.
   */
  getCachedBanners(): Banner[] {
    if (typeof window === 'undefined') return [];
    try {
      const item = localStorage.getItem(BANNERS_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[bannerService] Error reading localStorage cache:', e);
    }
    return [];
  },

  /**
   * Save banners to localStorage cache.
   */
  saveToCache(banners: Banner[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(banners));
    } catch (e) {
      console.error('[bannerService] Failed to save banners to cache:', e);
    }
  },

  /**
   * Fetch active banners for public frontend (or all banners for admin).
   */
  async fetchBanners(options?: { placement?: string; admin?: boolean }): Promise<Banner[]> {
    const cached = this.getCachedBanners();
    const endpoint = options?.admin
      ? '/api/admin/banners'
      : options?.placement
      ? `/api/banners?placement=${encodeURIComponent(options.placement)}`
      : '/api/banners';

    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.banners && Array.isArray(data.banners)) {
          if (options?.admin || !options?.placement) {
            this.saveToCache(data.banners);
          }
          return data.banners;
        }
      }
    } catch (err) {
      console.warn('[bannerService] Error fetching banners from server:', err);
    }

    if (options?.placement) {
      return cached.filter((b) => b.placement === options.placement && b.is_active);
    }
    return cached;
  },

  /**
   * Add a new banner to the database.
   */
  async addBanner(banner: Partial<Banner>): Promise<Banner> {
    const response = await fetch('/api/admin/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `ব্যানার তৈরি ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.banner;
  },

  /**
   * Update an existing banner in the database.
   */
  async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
    const response = await fetch('/api/admin/banners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `ব্যানার আপডেট ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.banner;
  },

  /**
   * Delete a banner from the database.
   */
  async deleteBanner(id: string): Promise<boolean> {
    const response = await fetch(`/api/admin/banners?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `ব্যানার মুছে ফেলা সম্ভব হয়নি (Status: ${response.status})`);
    }

    return true;
  },

  /**
   * Duplicate an existing banner.
   * Clones design and content, creates a new unique ID, appends "(কপি)", and sets inactive by default.
   */
  async duplicateBanner(banner: Banner): Promise<Banner> {
    const newId = `ban-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clonedName = `${banner.name || banner.title} (কপি)`;

    const duplicatedData: Partial<Banner> = {
      ...banner,
      id: newId,
      name: clonedName,
      title: banner.title,
      is_active: false, // Inactive by default per user requirement
      display_order: (banner.display_order || 1) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.addBanner(duplicatedData);
  },
};
