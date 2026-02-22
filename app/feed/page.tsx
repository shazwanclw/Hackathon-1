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
        <h1 className="page-title">Stray Feed</h1>
        <p className="page-subtitle">Latest community sightings, newest first.</p>

        {loading ? <LoadingState text="Loading feed..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && items.length === 0 ? (
          <div className="card p-4 text-sm text-muted">No sightings yet.</div>
        ) : null}

        {!loading && !error
          ? items.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt={`${item.type} sighting`} className="h-72 w-full object-cover" />
                ) : null}
                <div className="space-y-2 p-4 text-sm">
                  <p className="font-semibold capitalize text-brand-900">{item.type}</p>
                  <p className="text-xs text-muted">
                    Reported by:{' '}
                    {item.reporterUid ? (
                      <Link className="link-inline" href={`/profile?uid=${item.reporterUid}`}>
                        {item.reporterEmail}
                      </Link>
                    ) : (
                      <span>{item.reporterEmail}</span>
                    )}
                  </p>
                  {item.aiRiskUrgency ? (
                    <p className="text-xs text-muted">
                      AI risk: <span className="font-semibold capitalize text-brand-900">{item.aiRiskUrgency}</span>
                    </p>
                  ) : null}
                  {item.aiRiskReasonPreview ? <p className="text-xs text-muted">{item.aiRiskReasonPreview}...</p> : null}
                  <p className="text-brand-900">{item.caption || 'No caption provided.'}</p>
                  <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                  <div className="flex gap-4 text-sm">
                    <Link className="link-inline" href={`/animal?id=${item.animalId}`}>
                      Open animal profile
                    </Link>
                    <Link className="link-inline" href={`/map?animalId=${item.animalId}`}>
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