"use client";

import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';
import L from 'leaflet';
import { FormEvent, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { GeocodeResult, searchLocations } from '@/lib/geocoding';

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
};

const defaultMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function LocationClickHandler({ onPick }: { onPick: (point: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapViewSync({ point }: { point: { lat: number; lng: number } | null }) {
  const map = useMap();

  if (point) {
    map.setView(point, 16);
  }

  return null;
}

export default function MapPicker({ value, onChange }: Props) {
  const center = useMemo(() => value ?? { lat: 3.1390, lng: 101.6869 }, [value]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const rows = await searchLocations(trimmed);
      setResults(rows);
      if (!rows.length) {
        setError('No matching places found.');
      }
    } catch {
      setError('Location search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a place or address"
          aria-label="Search location"
        />
        <button className="btn-secondary shrink-0" type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {error ? <p className="text-xs text-muted">{error}</p> : null}
      {results.length ? (
        <div className="card max-h-40 overflow-auto p-2">
          {results.map((result) => (
            <button
              key={`${result.lat}-${result.lng}-${result.label}`}
              type="button"
              className="block w-full rounded-lg px-2 py-1 text-left text-sm text-brand-900 hover:bg-honey-200/60"
              onClick={() => {
                onChange({ lat: result.lat, lng: result.lng });
                setQuery(result.label);
                setResults([]);
              }}
            >
              {result.label || `${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`}
            </button>
          ))}
        </div>
      ) : null}
      <div className="h-72 overflow-hidden rounded-2xl border border-brand-300/80 shadow-[0_12px_30px_rgba(80,55,27,0.18)]">
        <MapContainer center={center} zoom={value ? 14 : 6} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewSync point={value} />
          <LocationClickHandler onPick={onChange} />
          {value ? <Marker position={value} icon={defaultMarkerIcon} /> : null}
        </MapContainer>
      </div>
    </div>
  );
}
