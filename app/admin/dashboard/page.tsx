"use client";

import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import CaseCard from '@/components/CaseCard';
import FiltersBar from '@/components/FiltersBar';
import { EmptyState, LoadingState } from '@/components/States';
import { listCases } from '@/lib/data';
import { AnimalType, CaseStatus, Urgency } from '@/lib/types';

export default function DashboardPage() {
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
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <FiltersBar
          status={filters.status}
          urgency={filters.urgency}
          animalType={filters.animalType}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value as any }))}
        />

        {loading ? <LoadingState text="Loading cases..." /> : null}
        {!loading && items.length === 0 ? <EmptyState text="No cases match current filters." /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <CaseCard key={item.id} caseItem={item} />
          ))}
        </div>
      </section>
    </AdminGuard>
  );
}
