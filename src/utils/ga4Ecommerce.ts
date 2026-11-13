import { Book, CartItem, OrderDetails } from '../types';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const TRACKED_GA4_ORDERS_KEY = 'shesher_pata_ga4_purchased_orders_v1';

function pushGA4Event(eventName: string, ecommerce: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  try {
    window.dataLayer = window.dataLayer || [];
    // Clear previous ecommerce values so GTM does not reuse stale product data.
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ event: eventName, ecommerce });
  } catch (error) {
    // Analytics must never interrupt shopping or checkout.
    console.warn('[GA4] Could not queue ecommerce event:', error);
  }
}

function toGA4Item(book: Book, quantity = 1): Record<string, unknown> {
  return {
    item_id: String(book.id),
    item_name: book.title || book.bangla_name || 'Book',
    item_category: book.category || undefined,
    price: Number(book.price) || 0,
    quantity: Math.max(1, Number(quantity) || 1),
  };
}

export function trackGA4ViewItem(book: Book): void {
  if (!book?.id) return;
  const price = Number(book.price) || 0;
  pushGA4Event('view_item', {
    currency: 'BDT',
    value: price,
    items: [toGA4Item(book)],
  });
}

export function trackGA4AddToCart(book: Book, quantity = 1): void {
  if (!book?.id) return;
  const qty = Math.max(1, Number(quantity) || 1);
  pushGA4Event('add_to_cart', {
    currency: 'BDT',
    value: (Number(book.price) || 0) * qty,
    items: [toGA4Item(book, qty)],
  });
}

export function trackGA4BeginCheckout(items: CartItem[], total: number, coupon?: string): void {
  if (!items?.length) return;
  const gaItems = items.map(({ book, quantity }) => toGA4Item(book, quantity));
  const itemValue = gaItems.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }, 0);

  pushGA4Event('begin_checkout', {
    currency: 'BDT',
    value: itemValue,
    coupon: coupon || undefined,
    items: gaItems,
  });
}

export function trackGA4Purchase(order: OrderDetails): boolean {
  if (!order?.orderId || !order.items?.length) return false;

  const transactionId = String(order.orderId).trim();
  if (!transactionId) return false;

  // Prevent duplicate purchase events after rerenders or revisiting the success UI.
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(TRACKED_GA4_ORDERS_KEY);
      const trackedIds: string[] = stored ? JSON.parse(stored) : [];
      if (trackedIds.includes(transactionId)) return false;
      trackedIds.push(transactionId);
      if (trackedIds.length > 100) trackedIds.splice(0, trackedIds.length - 100);
      window.localStorage.setItem(TRACKED_GA4_ORDERS_KEY, JSON.stringify(trackedIds));
    } catch {
      // Continue tracking if storage is unavailable.
    }
  }

  const items = order.items.map(({ book, quantity }) => toGA4Item(book, quantity));
  const itemValue = items.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }, 0);

  pushGA4Event('purchase', {
    transaction_id: transactionId,
    currency: 'BDT',
    value: Math.max(0, itemValue - (Number(order.discountAmount) || 0)),
    shipping: Number(order.deliveryFee) || 0,
    coupon: order.couponCode || undefined,
    items,
  });
  return true;
}
