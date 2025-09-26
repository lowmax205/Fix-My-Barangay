// Mapbox geocoding service wrapper
// Uses Mapbox Forward & Reverse geocoding APIs
// Token provided via NEXT_PUBLIC_MAPBOX_TOKEN (public token)

export interface GeocodeResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  relevance?: number;
}

const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

function getToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn('Mapbox token missing (NEXT_PUBLIC_MAPBOX_TOKEN)');
    return '';
  }
  return token;
}

export async function forwardGeocode(query: string, limit = 5): Promise<GeocodeResult[]> {
  const token = getToken();
  if (!token) return [];
  if (!query.trim()) return [];

  const url = `${MAPBOX_BASE}/${encodeURIComponent(query)}.json?access_token=${token}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f: { id: string; place_name: string; center: [number, number]; relevance?: number }) => ({
    id: f.id,
    place_name: f.place_name,
    center: f.center,
    relevance: f.relevance,
  }));
}

export async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  const url = `${MAPBOX_BASE}/${lng},${lat}.json?access_token=${token}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  return feature?.place_name || null;
}

const mapboxService = { forwardGeocode, reverseGeocode };
export default mapboxService;
