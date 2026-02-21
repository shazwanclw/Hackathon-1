"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import FiltersBar from '@/components/FiltersBar';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { listPublicMapCases } from '@/lib/data';
import { AnimalType, CaseStatus, Urgency } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PublicMapPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<{
    status: CaseStatus | 'all';
    urgency: Urgency | 'all';
    animalType: AnimalType | 'all';
  }>({ status: 'all', urgency: 'all', animalType: 'all' });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const rows = await listPublicMapCases(filters);
        if (!cancelled) setItems(rows);
      } catch {
        if (!cancelled) setError('Unable to load map data. Please check Firestore rules deployment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <PublicAccessGuard>
      <section className="space-y-4">
      <h1 className="text-2xl font-bold">Community Map</h1>
      <p className="text-sm text-slate-600">View submitted case markers and their current status.</p>
      <FiltersBar
        status={filters.status}
        urgency={filters.urgency}
        animalType={filters.animalType}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value as any }))}
      />
      {loading ? <LoadingState text="Loading map points..." /> : null}
      {!loading && error ? <ErrorState text={error} /> : null}
      {!loading && !error ? <MapView cases={items} /> : null}
      </section>
    </PublicAccessGuard>
  );
}
