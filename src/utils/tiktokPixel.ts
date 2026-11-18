import type { Book, CartItem, OrderDetails } from '../types';

const TIKTOK_PIXEL_ID = 'DBQU1KJC77U6EIDLNE00';
const PURCHASED_ORDERS_KEY = 'shesher_pata_tiktok_purchased_orders_v1';

type TikTokQueue = {
  page: () => void;
  track: (event: string, properties?: Record<string, unknown>) => void;
  load: (pixelId: string) => void;
  [key: string]: any;
};

declare global {
  interface Window {
    ttq?: TikTokQueue;
    TiktokAnalyticsObject?: string;
  }
}

let initialized = false;

export function initTikTokPixel(): void {
  if (typeof window === 'undefined' || initialized) return;

  try {
    const existing = window.ttq;
    if (existing && typeof existing.track === 'function' && (existing as any)._loaded) {
      initialized = true;
      return;
    }

    const ttq: any = existing || [];
    const methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
      'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie',
    ];

    ttq._i = ttq._i || {};
    ttq._t = ttq._t || {};
    ttq._o = ttq._o || {};

    methods.forEach((method) => {
      ttq[method] = ttq[method] || function (...args: unknown[]) {
        ttq.push([method, ...args]);
      };
    });

    ttq.load = function (pixelId: string) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid='
        + encodeURIComponent(pixelId) + '&lib=ttq';
      script.onerror = () => {
        console.warn('[TikTok Pixel] Failed to load the tracking script.');
      };
      const first = document.getElementsByTagName('script')[0];
      if (first?.parentNode) first.parentNode.insertBefore(script, first);
      else document.head.appendChild(script);
      ttq._i[pixelId] = [];
      ttq._i[pixelId]._u = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._t[pixelId] = Date.now();
      ttq._o[pixelId] = {};
    };

    window.ttq = ttq;
    window.TiktokAnalyticsObject = 'ttq';
    ttq.load(TIKTOK_PIXEL_ID);
    initialized = true;
  } catch (error) {
    console.warn('[TikTok Pixel] Initialization failed:', error);
  }
}

export function trackTikTokPageView(): void {
  if (typeof window === 'undefined' || !window.ttq) return;
  try {
    window.ttq.page();
  } catch (error) {
    console.warn('[TikTok Pixel] PageView could not be queued:', error);
  }
}

function track(event: string, properties: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.ttq) return;
  try {
    window.ttq.track(event, properties);
  } catch (error) {
    console.warn('[TikTok Pixel] Event could not be queued:', error);
  }
}

function item(book: Book, quantity = 1): Record<string, unknown> {
  return {
    content_id: String(book.id),
    content_type: 'product',
    content_name: book.bangla_name || book.title || 'Book',
    quantity: Math.max(1, Number(quantity) || 1),
    price: Number(book.price) || 0,
  };
}

export function trackTikTokViewContent(book: Book): void {
  if (!book?.id) return;
  track('ViewContent', {
    contents: [item(book)],
    content_type: 'product',
    value: Number(book.price) || 0,
    currency: 'BDT',
  });
}

export function trackTikTokAddToCart(book: Book, quantity = 1): void {
  if (!book?.id) return;
  const qty = Math.max(1, Number(quantity) || 1);
  track('AddToCart', {
    contents: [item(book, qty)],
    content_type: 'product',
    value: (Number(book.price) || 0) * qty,
    currency: 'BDT',
  });
}

export function trackTikTokInitiateCheckout(items: CartItem[], total: number): void {
  if (!items?.length) return;
  track('InitiateCheckout', {
    contents: items.map(({ book, quantity }) => item(book, quantity)),
    content_type: 'product',
    value: Math.max(0, Number(total) || 0),
    currency: 'BDT',
  });
}

export function trackTikTokCompletePayment(order: OrderDetails): boolean {
  if (!order?.orderId || !order.items?.length) return false;
  const orderId = String(order.orderId).trim();
  if (!orderId) return false;

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(PURCHASED_ORDERS_KEY);
      const tracked: string[] = stored ? JSON.parse(stored) : [];
      if (tracked.includes(orderId)) return false;
      tracked.push(orderId);
      if (tracked.length > 100) tracked.splice(0, tracked.length - 100);
      window.localStorage.setItem(PURCHASED_ORDERS_KEY, JSON.stringify(tracked));
    } catch {
      // Tracking must never interrupt order completion.
    }
  }

  track('CompletePayment', {
    contents: order.items.map(({ book, quantity }) => item(book, quantity)),
    content_type: 'product',
    value: Math.max(0, Number(order.total) || 0),
    currency: 'BDT',
    order_id: orderId,
  });
  return true;
}
