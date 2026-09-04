import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Suggestion {
  placeId: string | null;
  description: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onResolved?: (result: { address: string; placeId: string | null; latitude: number | null; longitude: number | null }) => void;
  regionCode?: string;
  placeholder?: string;
}

/**
 * Google Places address autocomplete. Suggestions are fetched through a backend
 * function so the Maps credentials never reach the browser.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onResolved,
  regionCode = 'TZ',
  placeholder = 'Start typing your delivery address...',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    // Debounced so typing does not fan out one request per keystroke.
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('places-autocomplete', {
        body: { input: value, regionCode },
      });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        console.error('Address lookup failed:', error);
        setSuggestions([]);
        return;
      }
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      setOpen(true);
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, regionCode]);

  const selectSuggestion = async (suggestion: Suggestion) => {
    skipNextFetch.current = true;
    onChange(suggestion.description);
    setSuggestions([]);
    setOpen(false);

    if (!suggestion.placeId || !onResolved) {
      onResolved?.({ address: suggestion.description, placeId: null, latitude: null, longitude: null });
      return;
    }

    const { data, error } = await supabase.functions.invoke('place-details', {
      body: { placeId: suggestion.placeId },
    });
    if (error || !data) {
      onResolved({ address: suggestion.description, placeId: suggestion.placeId, latitude: null, longitude: null });
      return;
    }
    onResolved({
      address: data.formattedAddress || suggestion.description,
      placeId: data.placeId ?? suggestion.placeId,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          aria-label="Delivery address"
          autoComplete="off"
          className="w-full pl-11 pr-10 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" size={16} />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-2 w-full bg-popover border border-foreground/10 rounded-2xl overflow-hidden shadow-xl">
          {suggestions.map((s, i) => (
            <li key={`${s.placeId ?? 'x'}-${i}`}>
              <button
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-foreground/5 transition-colors"
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
