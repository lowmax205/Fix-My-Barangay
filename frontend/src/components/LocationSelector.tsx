'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forwardGeocode, reverseGeocode } from '@/services/mapbox';
import useGeolocation from '@/hooks/useGeolocation';
import { MapPin, Loader2, Search } from 'lucide-react';

export interface LocationSelectorValue {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationSelectorProps {
  value?: LocationSelectorValue;
  onChange: (val: LocationSelectorValue) => void;
  disabled?: boolean;
  showUseMyLocation?: boolean;
}

// NOTE: This component intentionally does not integrate a full map library yet (kept lightweight for MVP)
// It provides: search suggestions, reverse geocode, and manual coordinate input fallback.
export const LocationSelector: React.FC<LocationSelectorProps> = ({ value, onChange, disabled, showUseMyLocation = true }) => {
  const [query, setQuery] = useState('');
  interface Suggestion { id: string; place_name: string; center: [number, number]; }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const geo = useGeolocation();

  // Fetch suggestions when query changes
  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
  const results = await forwardGeocode(query, 5);
  setSuggestions(results as Suggestion[]);
      } catch (e) {
        console.warn('Geocode failed', e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const chooseSuggestion = async (s: Suggestion) => {
    onChange({ latitude: s.center[1], longitude: s.center[0], address: s.place_name });
    setQuery(s.place_name);
    setSuggestions([]);
  };

  const useMyLocation = async () => {
    const pos = await geo.getCurrent();
    if (pos) {
      setResolving(true);
      try {
        const address = await reverseGeocode(pos.longitude, pos.latitude);
        onChange({ latitude: pos.latitude, longitude: pos.longitude, address: address || undefined });
        setQuery(address || `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`);
      } finally {
        setResolving(false);
      }
    }
  };

  const applyManual = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isFinite(lat) && isFinite(lng)) {
      onChange({ latitude: lat, longitude: lng });
      setQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Search address or place"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Location search"
        />
        <div className="absolute right-2 top-2 text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full max-h-52 overflow-auto rounded-md border bg-background shadow">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  onClick={() => chooseSuggestion(s)}
                >
                  {s.place_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showUseMyLocation && (
        <Button
          type="button"
            variant="outline"
          onClick={useMyLocation}
          disabled={resolving || disabled}
          className="w-full"
        >
          {resolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
          {resolving ? 'Setting location...' : 'Use My Current Location'}
        </Button>
      )}

      <details className="rounded border p-3 text-sm">
        <summary className="cursor-pointer select-none">Manual coordinates</summary>
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Latitude"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              aria-label="Latitude"
            />
            <Input
              placeholder="Longitude"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              aria-label="Longitude"
            />
          </div>
          <Button type="button" size="sm" onClick={applyManual} disabled={disabled}>
            Apply Coordinates
          </Button>
        </div>
      </details>

      {value && (
        <div className="text-xs text-muted-foreground">
          Selected: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)} {value.address ? `• ${value.address}` : ''}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
