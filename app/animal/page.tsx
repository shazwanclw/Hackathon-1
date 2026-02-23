"use client";

import React from 'react';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { getAnimalById, listAnimalSightings } from '@/lib/data';
import { AnimalProfile, AnimalSightingItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

function AnimalProfilePageContent() {
  const search = useSearchParams();
  const animalId = search.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animal, setAnimal] = useState<AnimalProfile | null>(null);
  const [sightings, setSightings] = useState<AnimalSightingItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!animalId) {
        setError('Animal id is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [animalDoc, sightingRows] = await Promise.all([
          getAnimalById(animalId),
          listAnimalSightings(animalId),
        ]);

        if (!animalDoc) {
          if (!cancelled) setError('Animal not found.');
          return;
        }

        if (!cancelled) {
          setAnimal(animalDoc);
          setSightings(sightingRows);
        }
      } catch (err) {
        const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
        if (!cancelled) setError(code ? `Failed to load profile (${code}).` : 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [animalId]);

  return (
    <PublicAccessGuard>
      {loading ? <LoadingState text="Loading animal profile..." /> : null}
      {!loading && error ? <ErrorState text={error} /> : null}
      {!loading && !error && !animal ? <ErrorState text="Animal not found." /> : null}

      {!loading && !error && animal ? (
        <section className="mx-auto max-w-3xl space-y-4">
          <h1 className="page-title">Animal Profile</h1>

          <article className="card overflow-hidden">
            {animal.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={animal.coverPhotoUrl} alt={`${animal.type} cover`} className="h-72 w-full object-cover" />
            ) : null}
            <div className="space-y-1 p-4 text-sm">
              <p className="capitalize text-brand-900">Type: {animal.type}</p>
              <p className="text-muted">Last seen: {animal.lastSeenAtLabel}</p>
              <p className="text-muted">Total sightings: {animal.sightingCount}</p>
              {animal.aiRisk ? (
                <div className="mt-3 rounded-xl border border-brand-300 bg-brand-100/55 p-3">
                  <p className="font-semibold text-brand-900">AI welfare risk screening (not diagnosis)</p>
                  <p className="capitalize text-brand-900">Urgency: {animal.aiRisk.urgency}</p>
                  <p className="text-brand-900">Reason: {animal.aiRisk.reason}</p>
                  <p className="text-brand-900">Visible indicators: {animal.aiRisk.visibleIndicators.join(', ') || 'none'}</p>
                  <p className="text-brand-900">Confidence: {animal.aiRisk.confidence}</p>
                  <p className="text-xs text-muted">{animal.aiRisk.disclaimer}</p>
                  <p className="text-xs text-brand-800/70">Generated: {animal.aiRisk.createdAtLabel}</p>
                </div>
              ) : (
                <p className="text-xs text-brand-800/70">AI welfare screening not available yet.</p>
              )}
            </div>
          </article>

          <section className="space-y-3">
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-brand-900">Sightings Timeline</h2>
            {sightings.length === 0 ? <EmptyState text="No sightings found for this animal." /> : null}
            {sightings.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt="Sighting" className="h-64 w-full object-cover" />
                ) : null}
                <div className="space-y-1 p-4 text-sm">
                  <p className="text-brand-900">{item.caption || 'No caption provided.'}</p>
                  <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                  <p className="text-xs text-muted">Location: {item.locationLabel}</p>
                </div>
              </article>
            ))}
          </section>
        </section>
      ) : null}
    </PublicAccessGuard>
  );
}

export default function AnimalProfilePage() {
  return (
    <Suspense
      fallback={
        <PublicAccessGuard>
          <LoadingState text="Loading animal profile..." />
        </PublicAccessGuard>
      }
    >
      <AnimalProfilePageContent />
    </Suspense>
  );
}
