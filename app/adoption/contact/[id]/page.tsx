"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { getAdoptionPostById } from '@/lib/data';
import { AdoptionPost } from '@/lib/types';

export default function AdoptionContactPage() {
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
            setError('Shelter details not found for this post.');
          } else {
            setItem(row);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load shelter information right now.');
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
      <section className="mx-auto max-w-2xl space-y-4">
        <h1 className="page-title">Shelter Contact</h1>
        <p className="page-subtitle">Reach out directly to continue the adoption process.</p>

        {loading ? <LoadingState text="Loading shelter contact..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && item ? (
          <article className="card space-y-2 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">{item.shelterName || 'Unknown shelter'}</p>
            <p className="text-brand-900">Pet: {item.petName}</p>
            <p className="text-brand-900">Email: {item.contactEmail || 'Not provided'}</p>
            <p className="text-brand-900">Phone: {item.phone || 'Not provided'}</p>
            <p className="text-brand-900">Address: {item.address || 'Not provided'}</p>
            <div className="flex gap-2 pt-2">
              <Link className="btn-ghost" href={`/adoption/${encodeURIComponent(item.id)}`}>
                Back to Post
              </Link>
              <Link className="btn-primary" href="/adoption">
                Browse More Pets
              </Link>
            </div>
          </article>
        ) : null}
      </section>
    </PublicAccessGuard>
  );
}