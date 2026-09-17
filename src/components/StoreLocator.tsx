import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Clock, Navigation, Search, Check, X, Store, ChevronRight } from 'lucide-react';
import { loadGoogleMaps, hasMapsBrowserKey, onMapsAuthFailure, isMapsAuthFailed } from '@/lib/googleMaps';
import { useCountry } from '@/context/CountryContext';

export interface StoreLocation {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  phone: string;
  hours: string;
  coordinates: { lat: number; lng: number };
  isFlagship?: boolean;
}

export const STORE_LOCATIONS: StoreLocation[] = [
  {
    id: 'sinza-flagship',
    name: 'African Boy Flagship Store',
    city: 'Dar es Salaam',
    country: 'Tanzania',
    address: 'Sinza Africana Road, Block B, Dar es Salaam, Tanzania',
    phone: '+255 744 123 456',
    hours: 'Mon - Sat: 09:00 AM - 08:00 PM | Sun: 12:00 PM - 06:00 PM',
    coordinates: { lat: -6.7781, lng: 39.2195 },
    isFlagship: true,
  },
  {
    id: 'mlimani-kiosk',
    name: 'African Boy Mlimani City Express',
    city: 'Dar es Salaam',
    country: 'Tanzania',
    address: 'Mlimani City Mall, Sam Nujoma Rd, Dar es Salaam, Tanzania',
    phone: '+255 744 123 457',
    hours: 'Mon - Sun: 10:00 AM - 09:00 PM',
    coordinates: { lat: -6.7717, lng: 39.2239 },
  },
  {
    id: 'lagos-hub',
    name: 'African Boy West Africa Hub',
    city: 'Lagos',
    country: 'Nigeria',
    address: 'Ademola Adetokunbo St, Victoria Island, Lagos, Nigeria',
    phone: '+234 812 345 6789',
    hours: 'Mon - Sat: 09:00 AM - 06:00 PM',
    coordinates: { lat: 6.4281, lng: 3.4219 },
  },
];

interface StoreLocatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectStore?: (store: StoreLocation) => void;
  selectedStoreId?: string;
  embedded?: boolean;
}

export default function StoreLocator({
  isOpen = true,
  onClose,
  onSelectStore,
  selectedStoreId,
  embedded = false,
}: StoreLocatorProps) {
  const { formatPrice } = useCountry();
  const [activeStore, setActiveStore] = useState<StoreLocation>(
    STORE_LOCATIONS.find((s) => s.id === selectedStoreId) || STORE_LOCATIONS[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  const filteredStores = STORE_LOCATIONS.filter(
    (store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isMapsAuthFailed()) {
      setMapStatus('unavailable');
      return;
    }
    return onMapsAuthFailure(() => setMapStatus('unavailable'));
  }, []);

  useEffect(() => {
    if (!hasMapsBrowserKey || mapStatus === 'unavailable') return;

    let isMounted = true;
    setMapStatus((s) => (s === 'ready' ? s : 'loading'));

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        if (!googleMapRef.current) {
          const map = new maps.Map(mapContainerRef.current, {
            center: activeStore.coordinates,
            zoom: 14,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
              { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4af37' }] },
              { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
              { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
              { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0e' }] },
            ],
          });
          googleMapRef.current = map;

          STORE_LOCATIONS.forEach((store) => {
            const marker = new maps.Marker({
              position: store.coordinates,
              map,
              title: store.name,
              animation: maps.Animation?.DROP,
            });

            marker.addListener('click', () => {
              setActiveStore(store);
            });

            markersRef.current[store.id] = marker;
          });
        }

        setMapStatus('ready');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[StoreLocator] maps load warning:', err);
        setMapStatus('unavailable');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (googleMapRef.current && activeStore) {
      googleMapRef.current.panTo(activeStore.coordinates);
      googleMapRef.current.setZoom(15);
    }
  }, [activeStore]);

  const content = (
    <div className="flex flex-col lg:flex-row h-[80vh] max-h-[700px] w-full bg-card rounded-3xl overflow-hidden border border-foreground/10 shadow-2xl">
      {/* Sidebar / Store list */}
      <div className="w-full lg:w-96 flex flex-col border-b lg:border-b-0 lg:border-r border-foreground/10 bg-background/50 backdrop-blur-md">
        <div className="p-5 border-b border-foreground/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="text-primary" size={22} />
              <h3 className="font-black italic text-lg uppercase tracking-tight">Our Stores</h3>
            </div>
            {onClose && !embedded && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search store by city or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-foreground/10 rounded-xl text-xs font-bold focus:border-primary outline-none transition-all placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {filteredStores.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-wider">
              No stores found matching your search.
            </div>
          ) : (
            filteredStores.map((store) => {
              const isSelected = activeStore.id === store.id;
              return (
                <div
                  key={store.id}
                  onClick={() => setActiveStore(store)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5'
                      : 'border-foreground/5 bg-card hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm uppercase tracking-tight">{store.name}</h4>
                        {store.isFlagship && (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest">
                            Flagship
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                        {store.city}, {store.country}
                      </p>
                    </div>
                    {onSelectStore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStore(store);
                          onClose?.();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          selectedStoreId === store.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-foreground/5 hover:bg-primary hover:text-primary-foreground text-foreground'
                        }`}
                      >
                        {selectedStoreId === store.id ? 'Selected' : 'Pick Up Here'}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground/90 font-medium flex items-start gap-1.5">
                    <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
                    <span>{store.address}</span>
                  </p>

                  <div className="pt-2 border-t border-foreground/5 flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-primary" /> {store.hours}
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-primary hover:underline font-bold text-[10px] uppercase tracking-wider ml-auto"
                    >
                      Directions <Navigation size={10} />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Map display area */}
      <div className="flex-1 relative bg-background min-h-[300px] lg:min-h-full">
        {mapStatus !== 'unavailable' ? (
          <div ref={mapContainerRef} className="w-full h-full" aria-label="Store locator map" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-card space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MapPin size={32} />
            </div>
            <h4 className="font-black italic uppercase text-lg">{activeStore.name}</h4>
            <p className="text-xs text-muted-foreground max-w-sm font-medium">{activeStore.address}</p>
            <p className="text-xs font-bold text-primary">{activeStore.phone}</p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeStore.coordinates.lat},${activeStore.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs uppercase tracking-widest px-6 py-3 flex items-center gap-2"
            >
              Open in Google Maps <Navigation size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return content;
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-5xl"
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
