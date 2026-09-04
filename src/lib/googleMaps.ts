/**
 * Loads the Google Maps JavaScript API once, using the referrer-restricted
 * browser key from the Lovable Google Maps connector.
 *
 * NOTE: the Lovable-managed browser key is restricted to *.lovable.app /
 * *.lovableproject.com. On other domains Google returns
 * RefererNotAllowedMapError — the loader rejects, and callers must degrade
 * gracefully (server-side autocomplete keeps working either way).
 */

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;

declare global {
  interface Window {
    google?: any;
    __abInitGoogleMaps?: () => void;
  }
}

let loadPromise: Promise<any> | null = null;

export const hasMapsBrowserKey = Boolean(BROWSER_KEY);

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error('Google Maps browser key is not configured'));

  loadPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Google Maps failed to load')), 12000);

    window.__abInitGoogleMaps = () => {
      clearTimeout(timeout);
      resolve(window.google.maps);
    };

    // Surface referrer/auth failures instead of leaving a blank grey box.
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const text = args.map(String).join(' ');
      if (text.includes('RefererNotAllowedMapError') || text.includes('ApiNotActivatedMapError')) {
        clearTimeout(timeout);
        reject(new Error(text));
      }
      originalError(...args);
    };

    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: 'async',
      callback: '__abInitGoogleMaps',
      libraries: 'places',
    });
    if (TRACKING_ID) params.set('channel', TRACKING_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Google Maps script failed to load'));
    };
    document.head.appendChild(script);
  });

  loadPromise.catch(() => {
    loadPromise = null;
  });

  return loadPromise;
}
