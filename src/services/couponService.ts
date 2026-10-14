import { Coupon } from '../types';

export const couponService = {
  /**
   * Validate a coupon code server-side for cart / checkout.
   */
  async validateCoupon(code: string, subtotal: number): Promise<{
    valid: boolean;
    error?: string;
    message?: string;
    coupon?: {
      id: string;
      code: string;
      discount_type: 'percentage' | 'fixed' | 'free_shipping';
      discount_value: number;
      discount_amount: number;
      minimum_order_amount: number;
      maximum_discount_amount: number | null;
      description: string;
    };
  }> {
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });

      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      console.error('[couponService] Validation network error:', err);
      return {
        valid: false,
        error: 'কুপন যাচাইয়ে নেটওয়ার্ক সমস্যা দেখা দিয়েছে।',
      };
    }
  },

  /**
   * Increment coupon used_count in database after confirmed checkout.
   */
  async recordUsage(code: string, orderId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderId }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Fetch all coupons for Admin Dashboard.
   */
  async fetchAdminCoupons(): Promise<Coupon[]> {
    const response = await fetch('/api/admin/coupons', {
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `কুপন তালিকা লোড করা যায়নি (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.coupons || [];
  },

  /**
   * Create a new coupon in database.
   */
  async addCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
    const response = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(coupon),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `কুপন তৈরি ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.coupon;
  },

  /**
   * Update an existing coupon in database.
   */
  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon> {
    const response = await fetch('/api/admin/coupons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `কুপন আপডেট ব্যর্থ হয়েছে (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.coupon;
  },

  /**
   * Delete a coupon from database.
   */
  async deleteCoupon(id: string): Promise<boolean> {
    const response = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `কুপন মুছে ফেলা সম্ভব হয়নি (Status: ${response.status})`);
    }

    return true;
  },
};
