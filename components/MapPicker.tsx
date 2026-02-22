"use client";

import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
};

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
    <div className="h-72 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={value ? 14 : 6} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationClickHandler onPick={onChange} />
        {value ? <Marker position={value} /> : null}
      </MapContainer>
    </div>
  );
}
