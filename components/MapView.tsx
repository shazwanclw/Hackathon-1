"use client";

import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';
import L from 'leaflet';
import { useRouter } from 'next/navigation';
import 'leaflet.heat';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

type MapCase = {
  id: string;
  type?: string;
  coverPhotoUrl?: string;
  location?: { lat?: number; lng?: number };
};

type HotspotCase = {
  id: string;
  caseId?: string;
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

function HotspotHeatLayer({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();

  useEffect(() => {
    const latLngs: [number, number, number?][] = points.map((point) => [point.lat, point.lng, 0.8]);
    const heatLayer = (L as any).heatLayer(latLngs, {
      radius: 32,
      blur: 20,
      maxZoom: 17,
      minOpacity: 0.45,
      gradient: {
        0.15: '#fde68a',
        0.35: '#fb923c',
        0.55: '#ef4444',
        0.8: '#dc2626',
        1.0: '#991b1b',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

export default function MapView({
  cases,
  mode = 'normal',
  hotspots = [],
}: {
  cases: MapCase[];
  mode?: 'normal' | 'hotspot';
  hotspots?: HotspotCase[];
}) {
  const router = useRouter();
  const points = cases
    .filter((item) => typeof item.location?.lat === 'number' && typeof item.location?.lng === 'number')
    .map((item) => ({ ...item, lat: item.location!.lat as number, lng: item.location!.lng as number }));

  const hotspotPoints = hotspots
    .filter((item) => typeof item.location?.lat === 'number' && typeof item.location?.lng === 'number')
    .map((item) => ({ ...item, lat: item.location!.lat as number, lng: item.location!.lng as number }));

  const activePoints = mode === 'hotspot' ? hotspotPoints : points;
  const center = activePoints[0] ? { lat: activePoints[0].lat, lng: activePoints[0].lng } : { lat: 3.1390, lng: 101.6869 };

  return (
    <div className="h-[65vh] rounded-[1.6rem] border-2 border-brand-500/70 bg-[linear-gradient(140deg,rgba(255,245,219,0.9),rgba(230,200,146,0.55))] p-1.5 shadow-[0_16px_36px_rgba(80,55,27,0.28)]">
      <div className="h-full overflow-hidden rounded-[1.25rem] border border-brand-300/80">
        <MapContainer center={center} zoom={activePoints[0] ? 12 : 6} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mode === 'hotspot' ? <HotspotHeatLayer points={hotspotPoints} /> : null}
        {mode === 'hotspot'
          ? hotspotPoints.map((item, index) => (
              <Marker
                key={item.id || item.caseId || `hotspot-anchor-${index}`}
                position={{ lat: item.lat, lng: item.lng }}
                icon={L.divIcon({
                  className: 'hotspot-anchor-marker',
                  html: '<span class="hotspot-anchor-marker__dot" />',
                  iconSize: [8, 8],
                  iconAnchor: [4, 4],
                })}
                interactive={false}
              />
            ))
          : points.map((item) => (
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
    </div>
  );
}
