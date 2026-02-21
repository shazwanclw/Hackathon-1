"use client";

import React from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { listFeedSightings } from '@/lib/data';
import { FeedSighting } from '@/lib/types';

export default function FeedPage() {
  const [items, setItems] = useState<FeedSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const rows = await listFeedSightings();
        if (!cancelled) setItems(rows);
      } catch {
        if (!cancelled) setError('Unable to load feed right now.');
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
      <section className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Stray Feed</h1>
        <p className="text-sm text-slate-600">Latest community sightings, newest first.</p>

        {loading ? <LoadingState text="Loading feed..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && items.length === 0 ? (
          <div className="card p-4 text-sm text-slate-600">No sightings yet.</div>
        ) : null}

        {!loading && !error
          ? items.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt={`${item.type} sighting`} className="h-72 w-full object-cover" />
                ) : null}
                <div className="space-y-2 p-4 text-sm">
                  <p className="font-semibold capitalize">{item.type}</p>
                  <p>{item.caption || 'No caption provided.'}</p>
                  <p className="text-xs text-slate-500">{item.createdAtLabel}</p>
                  <div className="flex gap-4 text-sm">
                    <Link className="underline" href={`/animal?id=${item.animalId}`}>
                      Open animal profile
                    </Link>
                    <Link className="underline" href={`/map?animalId=${item.animalId}`}>
                      View on map
                    </Link>
                  </div>
                </div>
              </article>
            ))
          : null}
      </section>
    </PublicAccessGuard>
  );
}
