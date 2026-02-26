"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import FiltersBar from '@/components/FiltersBar';
import { LoadingState } from '@/components/States';
import { listCases } from '@/lib/data';
import { AnimalType, CaseStatus, Urgency } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function AdminMapPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    status: CaseStatus | 'all';
    urgency: Urgency | 'all';
    animalType: AnimalType | 'all';
  }>({ status: 'all', urgency: 'all', animalType: 'all' });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const rows = await listCases(filters);
      if (!cancelled) setItems(rows);
      if (!cancelled) setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <AdminGuard>
      <section className="space-y-5">
        <div className="card space-y-4 p-5">
          <p className="pill">Operations</p>
          <h1 className="page-title">Admin Map</h1>
          <p className="page-subtitle">Filter and inspect operational case distribution across the city.</p>
          <FiltersBar
            status={filters.status}
            urgency={filters.urgency}
            animalType={filters.animalType}
            onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value as any }))}
          />
        </div>
        {loading ? <LoadingState text="Loading map points..." /> : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MapView cases={items} />
            <aside className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Filtered result</p>
              <p className="mt-2 font-[var(--font-display)] text-4xl font-semibold text-brand-900">{items.length}</p>
              <p className="text-sm text-brand-900">Cases currently matching selected filters.</p>
            </aside>
          </div>
        )}
      </section>
    </AdminGuard>
  );
}
