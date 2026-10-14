import { BookReview } from '../types';

export interface ReviewsResponse {
  success: boolean;
  reviews: BookReview[];
  rating: number;
  count: number;
  error?: string;
}

export interface EligibilityResponse {
  eligible: boolean;
  reason?: 'not_logged_in' | 'not_purchased' | 'database_unavailable';
  alreadyReviewed: boolean;
  existingReview: BookReview | null;
  orderId?: string;
  error?: string;
}

export const reviewService = {
  /**
   * Fetch reviews for a specific book.
   */
  async getBookReviews(bookId: string): Promise<ReviewsResponse> {
    try {
      const res = await fetch(`/api/reviews?book_id=${encodeURIComponent(bookId)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          reviews: [],
          rating: 5.0,
          count: 0,
          error: data.error || 'রিভিউ লোড করতে ব্যর্থ হয়েছে',
        };
      }
      return data;
    } catch (e: any) {
      return {
        success: false,
        reviews: [],
        rating: 5.0,
        count: 0,
        error: e.message || 'নেটওয়ার্ক সমস্যা',
      };
    }
  },

  /**
   * Check if current user is eligible to review this book.
   */
  async checkEligibility(params: {
    bookId: string;
    userId?: string;
    email?: string;
    phone?: string;
  }): Promise<EligibilityResponse> {
    try {
      const search = new URLSearchParams();
      search.set('book_id', params.bookId);
      if (params.userId) search.set('user_id', params.userId);
      if (params.email) search.set('email', params.email);
      if (params.phone) search.set('phone', params.phone);

      const res = await fetch(`/api/reviews/eligibility?${search.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      return data;
    } catch {
      return { eligible: false, alreadyReviewed: false, existingReview: null };
    }
  },

  /**
   * Submit or update a review.
   */
  async submitReview(payload: {
    book_id: string;
    rating: number;
    review_text: string;
    user_id?: string;
    user_name: string;
    user_email?: string;
    user_phone?: string;
  }): Promise<{ success: boolean; review?: BookReview; error?: string; message?: string }> {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'রিভিউ সাবমিট করতে সমস্যা হয়েছে' };
      }
      return { success: true, review: data.review, message: data.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'নেটওয়ার্ক সমস্যা' };
    }
  },
};
