"use client";

import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';
import L from 'leaflet';
import { useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

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

export default function MapPicker({ value, onChange }: Props) {
  const center = useMemo(() => value ?? { lat: 3.1390, lng: 101.6869 }, [value]);

  return (
    <div className="h-72 overflow-hidden rounded-2xl border border-brand-300/80 shadow-[0_12px_30px_rgba(80,55,27,0.18)]">
      <MapContainer center={center} zoom={value ? 14 : 6} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationClickHandler onPick={onChange} />
        {value ? <Marker position={value} icon={defaultMarkerIcon} /> : null}
      </MapContainer>
    </div>
  );
}
