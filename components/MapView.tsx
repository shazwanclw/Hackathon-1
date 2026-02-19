"use client";

import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

type MapCase = {
  id: string;
  status: string;
  ai?: { animalType?: string };
  location?: { lat?: number; lng?: number };
};

export default function MapView({ cases }: { cases: MapCase[] }) {
  const points = cases
    .filter((item) => typeof item.location?.lat === 'number' && typeof item.location?.lng === 'number')
    .map((item) => ({ ...item, lat: item.location!.lat as number, lng: item.location!.lng as number }));

  const center = points[0] ? { lat: points[0].lat, lng: points[0].lng } : { lat: 40.7128, lng: -74.006 };

  return (
    <div className="h-[65vh] overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={points[0] ? 12 : 4} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((item) => (
          <Marker key={item.id} position={{ lat: item.lat, lng: item.lng }}>
            <Popup>
              Case #{item.id}<br />
              {item.ai?.animalType ?? 'other'} | {item.status}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
