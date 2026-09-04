/**
 * Analytics layer for African Boy.
 *
 * Google Analytics 4 (gtag.js) is loaded from the Lovable Google Analytics
 * connector. No IDs are hardcoded — if the connector is not linked, every
 * helper below becomes a no-op so the app keeps working unchanged.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as
  | string
  | undefined;

let initialized = false;

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  if (!GA_MEASUREMENT_ID) {
    console.info('[analytics] Google Analytics connector not configured — tracking disabled.');
    return;
  }

  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, { send_page_view: true });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!initialized) return;
  gtag('event', name, params);
}

/** SPA "page" view — this app uses tab navigation instead of routes. */
export function trackPageView(tab: string) {
  trackEvent('page_view', {
    page_path: `/${tab}`,
    page_title: `African Boy — ${tab}`,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

type EcomItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  selectedSize?: string;
  selectedColor?: string;
};

function toGaItems(items: EcomItem[]) {
  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    item_category: item.category,
    item_variant: [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ') || undefined,
    price: item.price,
    quantity: item.quantity ?? 1,
  }));
}

export function trackViewItem(item: EcomItem, currency: string) {
  trackEvent('view_item', { currency, value: item.price, items: toGaItems([item]) });
}

export function trackAddToCart(item: EcomItem, currency: string) {
  trackEvent('add_to_cart', {
    currency,
    value: item.price * (item.quantity ?? 1),
    items: toGaItems([item]),
  });
}

export function trackBeginCheckout(items: EcomItem[], value: number, currency: string) {
  trackEvent('begin_checkout', { currency, value, items: toGaItems(items) });
}

export function trackPurchase(
  transactionId: string,
  items: EcomItem[],
  value: number,
  currency: string,
  shipping = 0,
) {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency,
    value,
    shipping,
    items: toGaItems(items),
  });
}
