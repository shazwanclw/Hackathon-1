"use client";

import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';
import L from 'leaflet';
import { useRouter } from 'next/navigation';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

type MapCase = {
  id: string;
  type?: string;
  coverPhotoUrl?: string;
  location?: { lat?: number; lng?: number };
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

function buildPhotoMarkerIcon(photoUrl: string) {
  const safeUrl = photoUrl.replace(/"/g, '%22');
  return L.divIcon({
    className: 'animal-photo-marker',
    html: `<span class="animal-photo-marker__ring"><img src="${safeUrl}" alt="Animal marker" /></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export default function MapView({ cases }: { cases: MapCase[] }) {
  const router = useRouter();
  const points = cases
    .filter((item) => typeof item.location?.lat === 'number' && typeof item.location?.lng === 'number')
    .map((item) => ({ ...item, lat: item.location!.lat as number, lng: item.location!.lng as number }));

  const center = points[0] ? { lat: points[0].lat, lng: points[0].lng } : { lat: 3.1390, lng: 101.6869 };

  return (
    <div className="h-[65vh] overflow-hidden rounded-2xl border border-brand-300/80 shadow-[0_14px_34px_rgba(80,55,27,0.2)]">
      <MapContainer center={center} zoom={points[0] ? 12 : 6} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((item) => (
          <Marker
            key={item.id}
            position={{ lat: item.lat, lng: item.lng }}
            icon={item.coverPhotoUrl ? buildPhotoMarkerIcon(item.coverPhotoUrl) : defaultMarkerIcon}
            eventHandlers={{
              click: () => router.push(`/animal?id=${item.id}`),
            }}
          >
            <Popup>
              Animal #{item.id}
              <br />
              {item.type ?? 'other'}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}