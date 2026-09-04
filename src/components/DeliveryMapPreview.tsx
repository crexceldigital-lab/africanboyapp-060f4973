import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { loadGoogleMaps, hasMapsBrowserKey, onMapsAuthFailure, isMapsAuthFailed } from '@/lib/googleMaps';

interface DeliveryMapPreviewProps {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  /** Fires when the pin is dragged, so the order stores the refined location. */
  onLocationChange?: (coords: { latitude: number; longitude: number }) => void;
}

/**
 * Interactive map preview for the checkout address step. Renders only when the
 * connector browser key is available and Google accepts this domain — otherwise
 * it silently hides so checkout is never blocked.
 */
export default function DeliveryMapPreview({
  latitude,
  longitude,
  address,
  onLocationChange,
}: DeliveryMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';

  // Hide the widget if Google rejects this domain/key at any point.
  useEffect(() => {
    if (isMapsAuthFailed()) {
      setStatus('unavailable');
      return;
    }
    return onMapsAuthFailure(() => setStatus('unavailable'));
  }, []);

  useEffect(() => {
    if (!hasCoords || !hasMapsBrowserKey || status === 'unavailable') return;

    let cancelled = false;
    setStatus((s) => (s === 'ready' ? s : 'loading'));

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const position = { lat: latitude as number, lng: longitude as number };

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: position,
            zoom: 16,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
          });
          markerRef.current = new maps.Marker({
            position,
            map: mapRef.current,
            draggable: true,
            title: address || 'Delivery location',
          });
          markerRef.current.addListener('dragend', (e: any) => {
            const lat = e.latLng?.lat();
            const lng = e.latLng?.lng();
            if (typeof lat === 'number' && typeof lng === 'number') {
              onLocationChange?.({ latitude: lat, longitude: lng });
            }
          });
        } else {
          mapRef.current.setCenter(position);
          markerRef.current?.setPosition(position);
        }

        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[maps] interactive preview unavailable:', err?.message || err);
        setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, hasCoords]);

  if (!hasCoords || !hasMapsBrowserKey || status === 'unavailable') return null;

  return (
    <div className="space-y-1.5">
      <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-foreground/10 bg-card">
        <div ref={containerRef} className="absolute inset-0" aria-label="Delivery location map" />
        {status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Loading map</span>
          </div>
        )}
      </div>
      {status === 'ready' && (
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <MapPin size={11} className="text-primary" /> Drag the pin to fine-tune your exact drop-off
        </p>
      )}
    </div>
  );
}
