import { SiteSettings } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SETTINGS_STORAGE_KEY = 'shesher_pata_site_settings_v1';
const SETTINGS_CHANGED_EVENT = 'shesher_pata_settings_changed';

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 'default_settings',
  meta_pixel_id: '',
  meta_pixel_enabled: false,
  phone: '+8801747692242',
  alt_phone: '',
  email: 'support@shesherpata.com',
  address: 'Mirpur 14, Dhaka, Bangladesh',
  support_hours: 'প্রতিদিন সকাল ৯টা হতে রাত ১০টা পর্যন্ত',
  announcement_badge: 'অফার',
  announcement_text: 'বইমেলা বিশেষ ছাড় — SHESHER10 কুপনে অতিরিক্ত ১০% ছাড়!',
  about_text: '"শেষের পাতা" কেবল একটি অনলাইন বইয়ের দোকান নয়, এটি প্রতিটি বইপ্রেমীর মনের একটি শান্তির আঙিনা। আমরা বিশ্বাস করি একটি ভালো বই একজন মানুষের জীবন বদলে দিতে পারে।',
  facebook_url: 'https://facebook.com',
  instagram_url: 'https://instagram.com',
  whatsapp_number: '8801747692242',
  steadfast_enabled: false,
  delivery_charge_inside: 60,
  delivery_charge_outside: 120,
  free_delivery_threshold: 1500,
  updated_at: new Date().toISOString(),
};

type SettingsListener = (settings: SiteSettings) => void;
const listeners = new Set<SettingsListener>();

export const settingsService = {
  /**
   * Synchronously get the cached settings (from localStorage if available).
   * Ensures zero latency rendering.
   */
  getCachedSettings(): SiteSettings {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS;
    }
    try {
      const item = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      }
    } catch {
      // Ignore localStorage read errors
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Asynchronously fetch current settings from Supabase if connected,
   * falling back to local storage cache.
   */
  async fetchSettings(): Promise<SiteSettings> {
    const cached = this.getCachedSettings();

    if (!isSupabaseConfigured() || !supabase) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select(
          'id, meta_pixel_id, meta_pixel_enabled, phone, alt_phone, email, address, support_hours, announcement_badge, announcement_text, about_text, facebook_url, instagram_url, whatsapp_number, steadfast_enabled, delivery_charge_inside, delivery_charge_outside, free_delivery_threshold, updated_at'
        )
        .eq('id', 'default_settings')
        .maybeSingle();

      if (error) {
        console.warn('[Settings] Supabase fetch error, using cache:', error.message);
        return cached;
      }

      if (data) {
        const settings: SiteSettings = {
          id: data.id || 'default_settings',
          meta_pixel_id: data.meta_pixel_id || '',
          meta_pixel_enabled: Boolean(data.meta_pixel_enabled),
          phone: '+8801747692242',
          alt_phone: '',
          email: data.email || cached.email || DEFAULT_SETTINGS.email,
          address: 'Mirpur 14, Dhaka, Bangladesh',
          support_hours: data.support_hours || cached.support_hours || DEFAULT_SETTINGS.support_hours,
          announcement_badge: data.announcement_badge || cached.announcement_badge || DEFAULT_SETTINGS.announcement_badge,
          announcement_text: data.announcement_text || cached.announcement_text || DEFAULT_SETTINGS.announcement_text,
          about_text: data.about_text || cached.about_text || DEFAULT_SETTINGS.about_text,
          facebook_url: data.facebook_url || cached.facebook_url || DEFAULT_SETTINGS.facebook_url,
          instagram_url: data.instagram_url || cached.instagram_url || DEFAULT_SETTINGS.instagram_url,
          whatsapp_number: '8801747692242',
          steadfast_enabled: data.steadfast_enabled !== undefined ? Boolean(data.steadfast_enabled) : (cached.steadfast_enabled ?? DEFAULT_SETTINGS.steadfast_enabled),
          delivery_charge_inside: data.delivery_charge_inside !== undefined && data.delivery_charge_inside !== null ? Number(data.delivery_charge_inside) : (cached.delivery_charge_inside ?? DEFAULT_SETTINGS.delivery_charge_inside),
          delivery_charge_outside: data.delivery_charge_outside !== undefined && data.delivery_charge_outside !== null ? Number(data.delivery_charge_outside) : (cached.delivery_charge_outside ?? DEFAULT_SETTINGS.delivery_charge_outside),
          free_delivery_threshold: data.free_delivery_threshold !== undefined && data.free_delivery_threshold !== null ? Number(data.free_delivery_threshold) : (cached.free_delivery_threshold ?? DEFAULT_SETTINGS.free_delivery_threshold),
          updated_at: data.updated_at || new Date().toISOString(),
        };
        this.saveToLocalCache(settings);
        this.notifyListeners(settings);
        return settings;
      }
    } catch (err) {
      console.warn('[Settings] Error querying Supabase:', err);
    }

    return cached;
  },

  /**
   * Save settings via secure server-side API (which validates admin session and updates Supabase).
   * Normal unauthorized users will receive a 401 response and cannot alter settings.
   */
  async saveSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = this.getCachedSettings();
    const updatedSettings: SiteSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // 1. Send update to secure server-side admin endpoint
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('অননুমোদিত অ্যাক্সেস: শুধুমাত্র অনুমোদিত অ্যাডমিন সেটিংস পরিবর্তন করতে পারবেন।');
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `সার্ভার ত্রুটি: ${response.statusText}`);
      }

      const resData = await response.json();
      if (resData.settings) {
        Object.assign(updatedSettings, resData.settings);
      }
    } catch (err: any) {
      // If unauthorized, rethrow to alert the user/caller
      if (err.message && err.message.includes('অননুমোদিত')) {
        throw err;
      }
      console.warn('[Settings] Server API failed, falling back to local cache update:', err.message);
    }

    // 2. Update local cache and broadcast
    this.saveToLocalCache(updatedSettings);
    this.notifyListeners(updatedSettings);

    return updatedSettings;
  },

  /**
   * Write to localStorage and dispatch custom window event for inter-tab / component sync.
   */
  saveToLocalCache(settings: SiteSettings) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(
        new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings })
      );
    } catch (e) {
      console.error('[Settings] Failed to save settings to localStorage:', e);
    }
  },

  /**
   * Register a listener for real-time settings updates.
   */
  subscribe(listener: SettingsListener): () => void {
    listeners.add(listener);

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<SiteSettings>;
      if (customEvent.detail) {
        listener(customEvent.detail);
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === SETTINGS_STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          listener(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SETTINGS_CHANGED_EVENT, handleCustomEvent);
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      listeners.delete(listener);
      if (typeof window !== 'undefined') {
        window.removeEventListener(SETTINGS_CHANGED_EVENT, handleCustomEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  },

  notifyListeners(settings: SiteSettings) {
    listeners.forEach((fn) => {
      try {
        fn(settings);
      } catch (e) {
        console.error('[Settings] Listener error:', e);
      }
    });
  },
};
