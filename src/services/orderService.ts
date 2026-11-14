import { OrderDetails, CartItem } from '../types';
import { toBengaliNumber } from '../utils/formatters';

/**
 * Format a timestamp into consistent Bengali date string e.g. ২০২৬-১০-১২
 */
export function formatBengaliOrderDate(dateInput?: string | Date): string {
  if (!dateInput) return toBengaliNumber(new Date().toISOString().slice(0, 10));
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return toBengaliNumber(`${year}-${month}-${day}`);
  } catch {
    return String(dateInput);
  }
}

/**
 * Map Supabase PostgreSQL row to strongly-typed OrderDetails
 */
export function rowToOrderDetails(row: any): OrderDetails {
  if (!row) return {} as OrderDetails;

  let parsedItems: CartItem[] = [];
  if (Array.isArray(row.items)) {
    parsedItems = row.items;
  } else if (typeof row.items === 'string') {
    try {
      const parsed = JSON.parse(row.items);
      parsedItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      parsedItems = [];
    }
  }

  // Ensure each item has well-formed book properties
  parsedItems = parsedItems.map((item: any) => {
    const book = item?.book || {};
    return {
      book: {
        ...book,
        id: book.id || `book-${Date.now()}`,
        title: book.title || book.bangla_name || book.english_name || 'বই',
        author: book.author || 'লেখক',
        price: Number(book.price) || 0,
        originalPrice: Number(book.originalPrice) || Number(book.price) || 0,
        image: book.image || book.cover_image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&h=560&q=80',
        cover_image: book.cover_image || book.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&h=560&q=80',
      },
      quantity: Number(item?.quantity) || 1,
    };
  });

  return {
    orderId: row.id,
    date: formatBengaliOrderDate(row.created_at),
    created_at: row.created_at,
    customerName: row.customer_name || '',
    phone: row.customer_phone || '',
    email: row.customer_email || '',
    userId: row.user_id || undefined,
    address: row.address || '',
    district: row.district || 'ঢাকা',
    thana: row.thana || '',
    postalCode: row.postal_code || '',
    deliveryOption: row.delivery_option || 'inside_dhaka',
    deliveryFee: Number(row.delivery_fee) || 0,
    paymentMethod: row.payment_method || 'cod',
    items: parsedItems,
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    couponCode: row.coupon_code || undefined,
    total: Number(row.total) || 0,
    status: row.status || 'pending',
    orderNotes: row.order_notes || '',
    steadfast_consignment_id: row.steadfast_consignment_id || undefined,
    steadfast_tracking_code: row.steadfast_tracking_code || undefined,
    steadfast_status: row.steadfast_status || undefined,
    steadfast_synced_at: row.updated_at || undefined,
  };
}

export const orderService = {
  /**
   * Save order to database via /api/orders
   */
  async createOrder(order: OrderDetails, userId?: string): Promise<{ success: boolean; error?: string; order?: any }> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...order,
          userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      return { success: true, order: data.order };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Fetch all customer orders for authorized Admin
   */
  async fetchAdminOrders(): Promise<OrderDetails[]> {
    try {
      const res = await fetch('/api/orders', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[orderService] Failed to fetch admin orders, status:', res.status, errorData);
        return [];
      }
      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        return data.orders.map(rowToOrderDetails);
      }
      return [];
    } catch (e) {
      console.error('[orderService] Failed to fetch admin orders:', e);
      return [];
    }
  },

  /**
   * Fetch customer orders by email, phone, or userId
   */
  async fetchCustomerOrders(params: { orderId: string; phone: string }): Promise<OrderDetails[]> {
    try {
      const search = new URLSearchParams({
        order_id: params.orderId.trim(),
        phone: params.phone.trim(),
      });
      const res = await fetch(`/api/orders?${search.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        return data.orders.map(rowToOrderDetails);
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Update order details (Admin only)
   */
  async updateOrder(orderId: string, updates: Partial<OrderDetails>): Promise<{ success: boolean; error?: string; order?: any }> {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          ...updates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      return { success: true, order: data.order };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Update order status (Admin only)
   */
  async updateOrderStatus(orderId: string, status: OrderDetails['status']): Promise<{ success: boolean; error?: string }> {
    return this.updateOrder(orderId, { status });
  },

  /**
   * Delete order (Admin only)
   */
  async deleteOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/orders?order_id=${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
};
