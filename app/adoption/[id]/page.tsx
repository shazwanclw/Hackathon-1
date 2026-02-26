"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { getAdoptionPostById } from '@/lib/data';
import { AdoptionPost } from '@/lib/types';

export default function AdoptionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  const [item, setItem] = useState<AdoptionPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!id) {
        setError('Missing adoption post ID.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const row = await getAdoptionPostById(id);
        if (!cancelled) {
          if (!row) {
            setError('Adoption post not found.');
          } else {
            setItem(row);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load adoption post details right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-3xl space-y-4">
        {loading ? <LoadingState text="Loading adoption post..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && item ? (
          <article className="card overflow-hidden">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt={`${item.petName} profile`} className="h-80 w-full object-cover" />
            ) : null}
            <div className="space-y-3 p-4">
              <h1 className="page-title !mb-0">{item.petName}</h1>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">{item.petType}</p>
              <p className="text-brand-900">Age: {item.ageText || 'Unknown'}</p>
              <p className="text-brand-900">{item.description || 'No description provided.'}</p>
              <p className="text-sm text-muted">Listed by {item.shelterName || 'Unknown shelter'} • {item.createdAtLabel}</p>
              <div className="flex gap-2">
                <Link className="btn-primary" href={`/adoption/contact/${encodeURIComponent(item.id)}`}>
                  Contact Shelter
                </Link>
                <Link className="btn-ghost" href="/adoption">
                  Back to Adoption
                </Link>
              </div>
            </div>
          </article>
        ) : null}
      </section>
    </PublicAccessGuard>
  );
}