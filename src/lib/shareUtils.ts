import { Product } from '../types';
import { trackProductShare } from './analytics';

export interface ShareOptions {
  product: Product;
  formattedPrice: string;
}

/**
 * Builds the canonical product URL pointing directly to the product detail page
 */
export function getProductCanonicalUrl(product: Product): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const identifier = product.id || product.name.toLowerCase().replace(/\s+/g, '-');
  return `${origin}/shop?product=${encodeURIComponent(identifier)}`;
}

/**
 * Generates formatted share text for a given product
 */
export function getProductShareText(product: Product, formattedPrice: string): string {
  return `Check out this African Boy product: ${product.name}\n\nPrice: ${formattedPrice}\n\nDiscover it at African Boy.`;
}

/**
 * Generates WhatsApp pre-filled message according to African Boy specification:
 * Check out this African Boy product:
 * 
 * [PRODUCT NAME]
 * 
 * TSh [PRICE]
 * 
 * [PRODUCT URL]
 */
export function getWhatsAppShareText(product: Product, formattedPrice: string): string {
  const url = getProductCanonicalUrl(product);
  const priceDisplay = formattedPrice.startsWith('TSh')
    ? formattedPrice
    : `TSh ${product.price.toLocaleString()}`;
  return `Check out this African Boy product:\n\n${product.name}\n\n${priceDisplay}\n\n${url}`;
}

export async function shareToWhatsApp({ product, formattedPrice }: ShareOptions): Promise<void> {
  const url = getProductCanonicalUrl(product);
  const text = getWhatsAppShareText(product, formattedPrice);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  
  trackProductShare(product, 'whatsapp', url);
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

export async function shareToFacebook({ product }: ShareOptions): Promise<void> {
  const url = getProductCanonicalUrl(product);
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  
  trackProductShare(product, 'facebook', url);
  window.open(facebookUrl, '_blank', 'noopener,noreferrer');
}

export async function shareToX({ product, formattedPrice }: ShareOptions): Promise<void> {
  const url = getProductCanonicalUrl(product);
  const text = `Check out ${product.name} (${formattedPrice}) on African Boy:`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  
  trackProductShare(product, 'x', url);
  window.open(xUrl, '_blank', 'noopener,noreferrer');
}

export async function copyProductLink({ product }: ShareOptions): Promise<boolean> {
  const url = getProductCanonicalUrl(product);
  trackProductShare(product, 'copy_link', url);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard writeText failed, fallback using textarea:', err);
  }

  // Fallback for older webviews/browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    console.error('Copy link fallback failed:', e);
    return false;
  }
}

export async function shareNative({ product, formattedPrice }: ShareOptions): Promise<boolean> {
  const url = getProductCanonicalUrl(product);
  const text = getProductShareText(product, formattedPrice);
  
  trackProductShare(product, 'native_share', url);

  if (navigator.share) {
    try {
      await navigator.share({
        title: product.name,
        text,
        url,
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Native share error:', err);
      }
      return false;
    }
  }
  return false;
}

export async function shareToInstagramStory({ product, formattedPrice }: ShareOptions): Promise<{ success: boolean; isMobileNative: boolean }> {
  const url = getProductCanonicalUrl(product);
  const text = `Check out ${product.name} on African Boy: ${url}`;

  trackProductShare(product, 'instagram_story', url);

  // Check Web Share API capability
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `${product.name} — African Boy`,
        text,
        url,
      });
      return { success: true, isMobileNative: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, isMobileNative: true };
      }
    }
  }

  // Desktop or fallback: Copy URL to clipboard for manual Instagram story attachment
  await copyProductLink({ product, formattedPrice });
  return { success: true, isMobileNative: false };
}

export async function shareToInstagramDirect({ product, formattedPrice }: ShareOptions): Promise<{ success: boolean; linkCopied: boolean }> {
  const url = getProductCanonicalUrl(product);
  trackProductShare(product, 'instagram_direct', url);

  const copied = await copyProductLink({ product, formattedPrice });

  // Try opening Instagram Direct inbox if on web/mobile
  try {
    const igDirectUrl = 'https://www.instagram.com/direct/inbox/';
    window.open(igDirectUrl, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.warn('Could not open Instagram Direct window:', e);
  }

  return { success: true, linkCopied: copied };
}

/**
 * Dynamically updates document title and Open Graph meta tags for social media previews
 */
export function updateOpenGraphMeta(product: Product | null): void {
  if (typeof window === 'undefined' || !document || !product) return;

  const url = getProductCanonicalUrl(product);
  const title = `${product.name} — AFRICAN BOY`;
  const description = product.description || `Official African Boy luxury apparel: ${product.name}. Price: TSh ${product.price.toLocaleString()}.`;
  const image = product.image_url;

  document.title = title;

  const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
  setMetaTag('meta[property="og:image"]', 'property', 'og:image', image);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', url);
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', image);
}

