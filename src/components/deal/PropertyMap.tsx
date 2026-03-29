'use client';

import { useEffect, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface Props {
  address: string;
  city: string;
  neighborhood?: string;
  state: string;
}

interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
}

async function geocode(query: string): Promise<GeoResult | null> {
  try {
    const encoded = encodeURIComponent(query + ', Brasil');
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=br`,
      { headers: { 'User-Agent': 'CheckDeal/1.0' } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: +data[0].lat, lon: +data[0].lon, displayName: data[0].display_name };
  } catch {
    return null;
  }
}

export function PropertyMap({ address, city, neighborhood, state }: Props) {
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fullAddress = [address, neighborhood, city, state].filter(Boolean).join(', ');
  const query = address || `${neighborhood || ''} ${city}`.trim();

  const load = async () => {
    setLoading(true);
    // Try full address first, fallback to neighborhood + city
    let result = address ? await geocode(fullAddress) : null;
    if (!result) result = await geocode(`${neighborhood || ''} ${city} ${state}`);
    if (!result) result = await geocode(city);
    setGeo(result);
    setLoading(false);
    setLoaded(true);
  };

  if (!loaded) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-700 text-sm">Property Location</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            {loading ? 'Loading map…' : 'Show on Map'}
          </button>
        </div>
        <div className="px-5 pb-4 text-sm text-slate-500">
          📍 {fullAddress || `${city}, ${state}`}
        </div>
      </div>
    );
  }

  if (!geo) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <MapPin className="w-4 h-4" />
          <span>Could not locate: {fullAddress}</span>
          <a href={`https://www.google.com/maps/search/${encodeURIComponent(fullAddress)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-blue-500 hover:underline flex items-center gap-1">
            Open in Google Maps <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // Build OpenStreetMap iframe embed
  const zoom = address ? 17 : neighborhood ? 15 : 13;
  const delta = zoom >= 17 ? 0.003 : zoom >= 15 ? 0.01 : 0.05;
  const bbox = `${geo.lon - delta},${geo.lat - delta},${geo.lon + delta},${geo.lat + delta}`;
  const markerUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${geo.lat},${geo.lon}`;

  const googleMapsUrl = `https://www.google.com/maps?q=${geo.lat},${geo.lon}`;
  const zapiUrl = `https://www.zapimoveis.com.br/venda/imoveis/${state.toLowerCase()}+${encodeURIComponent(city.toLowerCase())}/`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-700 text-sm">Property Location</span>
        </div>
        <div className="flex items-center gap-3">
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1">
            Google Maps <ExternalLink className="w-3 h-3" />
          </a>
          <a href={zapiUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1">
            ZAP Imóveis <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <iframe
        src={markerUrl}
        width="100%"
        height="320"
        style={{ border: 0 }}
        title="Property location"
        loading="lazy"
      />

      <div className="px-5 py-3 text-xs text-slate-400 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {geo.displayName.split(',').slice(0, 4).join(',')}
        <span className="ml-auto">© OpenStreetMap contributors</span>
      </div>
    </div>
  );
}
