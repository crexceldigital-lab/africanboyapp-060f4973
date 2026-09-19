/**
 * Analytics layer for African Boy e-commerce storefront.
 * Integrates Google Analytics 4 (GA4) with deduplication and clean abstractions.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = (
  import.meta.env.VITE_GA_MEASUREMENT_ID ||
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY ||
  'G-AFRICANBOY1'
) as string;

let initialized = false;
const firedEventsCache = new Set<string>();

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;

  initialized = true;

  if (GA_MEASUREMENT_ID && !document.getElementById('ga4-script')) {
    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: true,
      anonymize_ip: true,
    });
  }
}

export function trackEvent(name: string, params: Record<string, unknown> = {}, dedupeKey?: string) {
  if (dedupeKey) {
    if (firedEventsCache.has(dedupeKey)) return;
    firedEventsCache.add(dedupeKey);
  }
  gtag('event', name, params);
}

// Extract UTM parameters and referrer info cleanly
export function getTrafficParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
    referrer: document.referrer || undefined,
  };
}

/** SPA Page View tracking */
export function trackPageView(pagePath: string, pageTitle?: string) {
  initAnalytics();
  trackEvent('page_view', {
    page_path: pagePath.startsWith('/') ? pagePath : `/${pagePath}`,
    page_title: pageTitle || `African Boy — ${pagePath}`,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    ...getTrafficParams(),
  });
}

export type EcomItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  sku?: string;
  selectedSize?: string;
  selectedColor?: string;
};

function toGaItems(items: EcomItem[]) {
  return items.map((item) => ({
    item_id: item.sku || item.id,
    item_name: item.name,
    item_category: item.category || 'General',
    item_variant: [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ') || undefined,
    price: item.price,
    quantity: item.quantity ?? 1,
  }));
}

export function trackViewItemList(listName: string, items: EcomItem[], currency: string) {
  initAnalytics();
  trackEvent('view_item_list', {
    item_list_name: listName,
    items: toGaItems(items),
  });
}

export function trackSelectItem(item: EcomItem, listName: string, currency: string) {
  initAnalytics();
  trackEvent('select_item', {
    item_list_name: listName,
    items: toGaItems([item]),
  });
}

export function trackViewItem(item: EcomItem, currency: string) {
  initAnalytics();
  trackEvent('view_item', {
    currency,
    value: item.price,
    items: toGaItems([item]),
  });
}

export function trackAddToCart(item: EcomItem, currency: string) {
  initAnalytics();
  trackEvent('add_to_cart', {
    currency,
    value: item.price * (item.quantity ?? 1),
    items: toGaItems([item]),
  });
}

export function trackRemoveFromCart(item: EcomItem, currency: string) {
  initAnalytics();
  trackEvent('remove_from_cart', {
    currency,
    value: item.price * (item.quantity ?? 1),
    items: toGaItems([item]),
  });
}

export function trackViewCart(items: EcomItem[], value: number, currency: string) {
  initAnalytics();
  trackEvent('view_cart', {
    currency,
    value,
    items: toGaItems(items),
  });
}

export function trackBeginCheckout(items: EcomItem[], value: number, currency: string) {
  initAnalytics();
  trackEvent('begin_checkout', {
    currency,
    value,
    items: toGaItems(items),
  });
}

export function trackAddShippingInfo(items: EcomItem[], value: number, currency: string, shippingTier: string) {
  initAnalytics();
  trackEvent('add_shipping_info', {
    currency,
    value,
    shipping_tier: shippingTier,
    items: toGaItems(items),
  });
}

export function trackAddPaymentInfo(items: EcomItem[], value: number, currency: string, paymentMethod: string) {
  initAnalytics();
  trackEvent('add_payment_info', {
    currency,
    value,
    payment_type: paymentMethod,
    items: toGaItems(items),
  });
}

export function trackPurchase(
  transactionId: string,
  items: EcomItem[],
  value: number,
  currency: string,
  shipping = 0,
) {
  initAnalytics();
  const dedupeKey = `purchase:${transactionId}`;
  trackEvent(
    'purchase',
    {
      transaction_id: transactionId,
      currency,
      value,
      shipping,
      items: toGaItems(items),
    },
    dedupeKey
  );
}

/** Track POS In-Store sale completion separately from online e-commerce GA events */
export function trackPosSaleCompleted(
  receiptNumber: string,
  items: EcomItem[],
  value: number,
  currency: string,
  storeId: number,
  staffUserId: string
) {
  initAnalytics();
  trackEvent('pos_sale_completed', {
    receipt_number: receiptNumber,
    channel: 'in_store',
    store_id: storeId,
    staff_user_id: staffUserId,
    currency,
    value,
    items: toGaItems(items),
  }, `pos_sale:${receiptNumber}`);
}

