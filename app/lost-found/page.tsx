"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { listLostFoundPosts } from '@/lib/data';
import { LostFoundPost } from '@/lib/types';

export default function LostFoundPage() {
  const [items, setItems] = useState<LostFoundPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const rows = await listLostFoundPosts();
        if (!cancelled) setItems(rows);
      } catch {
        if (!cancelled) setError('Unable to load Lost & Found posts right now.');
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
      <section className="mx-auto max-w-6xl space-y-4 pb-20">
        <h1 className="page-title">Lost & Found Pets</h1>
        <p className="page-subtitle">Browse owner posts and contact them directly if you spot their pet.</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {loading ? <LoadingState text="Loading posts..." /> : null}
            {!loading && error ? <ErrorState text={error} /> : null}
            {!loading && !error && items.length === 0 ? <EmptyState text="No posts yet." /> : null}

            {!loading && !error
              ? items.map((item) => (
                  <article key={item.id} className="card overflow-hidden">
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt={`${item.petName} post`} className="h-80 w-full object-cover" />
                    ) : null}
                    <div className="space-y-2 p-4 text-sm">
                      <p className="font-semibold text-brand-900">{item.petName}</p>
                      <p className="text-brand-900">{item.description || 'No description provided.'}</p>
                      {item.locationText ? (
                        <p className="text-xs text-brand-800/80">Last seen: {item.locationText}</p>
                      ) : null}
                      <p className="text-sm text-brand-900">
                        Contact: <span className="font-semibold">{item.contactInfo}</span>
                      </p>
                      <p className="text-xs text-brand-800/70">Posted by {item.authorEmail || 'Unknown'} • {item.createdAtLabel}</p>
                    </div>
                  </article>
                ))
              : null}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
            <div className="card-elevated space-y-3 border border-honey-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">New</p>
              <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">Try the AI Lost & Found feature</h2>
              <p className="text-sm text-brand-900">
                Upload your pet photo and get top possible matches from recent stray reports.
              </p>
              <Link className="btn-primary w-full justify-center text-center" href="/lost-found/ai-match">
                Try AI Match
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <Link
        href="/lost-found/new"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-honey-50 shadow-[0_10px_24px_rgba(80,55,27,0.35)] hover:bg-brand-800"
      >
        + Create Post
      </Link>
    </PublicAccessGuard>
  );
}
