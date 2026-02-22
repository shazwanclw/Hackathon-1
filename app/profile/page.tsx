"use client";

import React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { observeAuth } from '@/lib/auth';
import { getUserProfileSummary, listUserFeedSightings } from '@/lib/data';
import { FeedSighting, UserProfileSummary } from '@/lib/types';

export default function ProfilePage() {
  const search = useSearchParams();
  const queryUid = useMemo(() => (search.get('uid') || '').trim(), [search]);
  const [authUid, setAuthUid] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [reports, setReports] = useState<FeedSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = observeAuth((user) => {
      setAuthUid(user?.uid ?? '');
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const uid = queryUid || authUid;
    if (!uid) {
      setLoading(false);
      setError('User profile is unavailable.');
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const [summary, rows] = await Promise.all([getUserProfileSummary(uid), listUserFeedSightings(uid)]);
        if (!cancelled) {
          setProfile(summary);
          setReports(rows);
        }
      } catch {
        if (!cancelled) setError('Failed to load profile right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, authUid, queryUid]);

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-3xl space-y-4">
        <h1 className="page-title">User Profile</h1>

        {loading ? <LoadingState text="Loading profile..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && profile ? (
          <article className="card p-4 text-sm">
            <p className="font-semibold text-brand-900">{profile.email}</p>
            <p className="text-xs text-muted">User ID: {profile.uid}</p>
            <p className="text-xs text-muted">Reports submitted: {profile.reportCount}</p>
          </article>
        ) : null}

        {!loading && !error ? (
          <section className="space-y-3">
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-brand-900">Reports</h2>
            {reports.length === 0 ? <EmptyState text="No reports found for this user." /> : null}
            {reports.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt={`${item.type} sighting`} className="h-64 w-full object-cover" />
                ) : null}
                <div className="space-y-2 p-4 text-sm">
                  <p className="font-semibold capitalize text-brand-900">{item.type}</p>
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
            ))}
          </section>
        ) : null}
      </section>
    </PublicAccessGuard>
  );
}