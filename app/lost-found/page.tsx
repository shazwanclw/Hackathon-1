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
      <section className="mx-auto max-w-6xl space-y-6 pb-20">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="card-elevated p-6 sm:p-8">
            <p className="pill">Community board</p>
            <h1 className="page-title mt-3">Lost & Found Pets</h1>
            <p className="page-subtitle mt-2">Browse owner posts and contact them directly if you spot their pet.</p>
          </div>
          <aside className="card-elevated space-y-3 border border-honey-300 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">AI Help</p>
            <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">Try the AI Lost & Found feature</h2>
            <p className="text-sm text-brand-900">
              Upload your pet photo and get top possible matches from recent stray reports.
            </p>
            <Link className="btn-primary w-full justify-center text-center" href="/lost-found/ai-match">
              Try AI Match
            </Link>
          </aside>
        </div>
        {loading ? <LoadingState text="Loading posts..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}
        {!loading && !error && items.length === 0 ? <EmptyState text="No posts yet." /> : null}

        {!loading && !error ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt={`${item.petName} post`} className="h-64 w-full object-cover" />
                ) : null}
                <div className="space-y-3 p-5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">{item.petName}</p>
                    <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                  </div>
                  <p className="text-brand-900">{item.description || 'No description provided.'}</p>
                  {item.locationText ? (
                    <p className="rounded-xl border border-brand-300/70 bg-brand-100/50 px-3 py-2 text-xs text-brand-800">Last seen: {item.locationText}</p>
                  ) : null}
                  <p className="text-sm text-brand-900">
                    Contact: <span className="font-semibold">{item.contactInfo}</span>
                  </p>
                  <p className="text-xs text-brand-800/70">Posted by {item.authorEmail || 'Unknown'}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <Link
        href="/lost-found/new"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-brand-900 px-7 py-4 text-base font-semibold text-honey-50 shadow-[0_10px_24px_rgba(80,55,27,0.35)] hover:bg-brand-800"
      >
        + Create Post
      </Link>
    </PublicAccessGuard>
  );
}
