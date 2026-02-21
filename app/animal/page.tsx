"use client";

import React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { getAnimalById, listAnimalSightings } from '@/lib/data';
import { AnimalProfile, AnimalSightingItem } from '@/lib/types';

export default function AnimalProfilePage() {
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
          <h1 className="text-2xl font-bold">Animal Profile</h1>

          <article className="card overflow-hidden">
            {animal.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={animal.coverPhotoUrl} alt={`${animal.type} cover`} className="h-72 w-full object-cover" />
            ) : null}
            <div className="space-y-1 p-4 text-sm">
              <p className="capitalize">Type: {animal.type}</p>
              <p>Last seen: {animal.lastSeenAtLabel}</p>
              <p>Total sightings: {animal.sightingCount}</p>
            </div>
          </article>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Sightings Timeline</h2>
            {sightings.length === 0 ? <EmptyState text="No sightings found for this animal." /> : null}
            {sightings.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt="Sighting" className="h-64 w-full object-cover" />
                ) : null}
                <div className="space-y-1 p-4 text-sm">
                  <p>{item.caption || 'No caption provided.'}</p>
                  <p className="text-xs text-slate-500">{item.createdAtLabel}</p>
                  <p className="text-xs text-slate-600">Location: {item.locationLabel}</p>
                </div>
              </article>
            ))}
          </section>
        </section>
      ) : null}
    </PublicAccessGuard>
  );
}
