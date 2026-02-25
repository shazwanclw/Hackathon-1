"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { listAnimalMapMarkers, listPublicMapCases } from '@/lib/data';
import { AnimalMapMarker, PublicMapCase } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PublicMapPage() {
  const [items, setItems] = useState<AnimalMapMarker[]>([]);
  const [hotspotItems, setHotspotItems] = useState<PublicMapCase[]>([]);
  const [mapMode, setMapMode] = useState<'normal' | 'hotspot'>('normal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const [rows, hotspotRows] = await Promise.all([listAnimalMapMarkers(), listPublicMapCases()]);
        if (!cancelled) {
          setItems(rows);
          setHotspotItems(hotspotRows);
        }
      } catch (err) {
        const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
        if (!cancelled) setError(code ? `Unable to load map (${code}).` : 'Unable to load map data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicAccessGuard>
      <section className="space-y-4">
        <h1 className="page-title">Community Map</h1>
        <p className="page-subtitle">
          {mapMode === 'normal'
            ? 'One marker per animal thread at its latest known location.'
            : 'Hotspot view shows density of all reported stray locations.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={mapMode === 'normal' ? 'segment-active' : 'segment'}
            onClick={() => setMapMode('normal')}
          >
            Normal map
          </button>
          <button
            type="button"
            className={mapMode === 'hotspot' ? 'segment-active' : 'segment'}
            onClick={() => setMapMode('hotspot')}
          >
            Hotspot map
          </button>
        </div>
        {loading ? <LoadingState text="Loading map points..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}
        {!loading && !error ? (
          <MapView cases={items} mode={mapMode} hotspots={hotspotItems} />
        ) : null}
      </section>
    </PublicAccessGuard>
  );
}
