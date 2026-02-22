"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { listAnimalMapMarkers } from '@/lib/data';
import { AnimalMapMarker } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PublicMapPage() {
  const [items, setItems] = useState<AnimalMapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const rows = await listAnimalMapMarkers();
        if (!cancelled) setItems(rows);
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
        <p className="page-subtitle">One marker per animal thread at its latest known location.</p>
        {loading ? <LoadingState text="Loading map points..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}
        {!loading && !error ? <MapView cases={items} /> : null}
      </section>
    </PublicAccessGuard>
  );
}