"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from 'firebase/auth';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { isUserAdmin, isUserShelter, observeAuth } from '@/lib/auth';
import { listAdoptionPosts } from '@/lib/data';
import { AdoptionPost } from '@/lib/types';

export default function AdoptionPage() {
  const [items, setItems] = useState<AdoptionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    const unsub = observeAuth((next) => {
      setUser(next);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const rows = await listAdoptionPosts('available');
        if (!cancelled) {
          setItems(rows);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load adoption posts right now.');
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkRole() {
      if (!user) {
        setCanCreate(false);
        return;
      }

      const [admin, shelter] = await Promise.all([isUserAdmin(user.uid), isUserShelter(user.uid)]);
      if (!cancelled) {
        setCanCreate(admin || shelter);
      }
    }

    checkRole();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-6xl space-y-4 pb-20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="page-title">Adoption Center</h1>
            <p className="page-subtitle">Discover pets from verified shelters and connect directly for adoption.</p>
          </div>
          {canCreate ? (
            <Link className="btn-primary" href="/adoption/new">
              Create Post
            </Link>
          ) : null}
        </div>

        {loading ? <LoadingState text="Loading adoptable pets..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}
        {!loading && !error && items.length === 0 ? <EmptyState text="No pets currently listed for adoption." /> : null}

        {!loading && !error ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photoUrl} alt={`${item.petName} adoption profile`} className="h-64 w-full object-cover" />
                ) : null}
                <div className="space-y-2 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">{item.petType}</p>
                  <h2 className="text-xl font-semibold text-brand-900">{item.petName}</h2>
                  <p className="text-sm text-brand-900">Age: {item.ageText || 'Unknown'}</p>
                  <p className="text-sm text-brand-900">{item.description || 'No description provided.'}</p>
                  <p className="text-xs text-muted">Shelter: {item.shelterName || 'Unknown shelter'}</p>
                  <div className="flex gap-2">
                    <Link className="btn-ghost" href={`/adoption/${encodeURIComponent(item.id)}`}>
                      View Details
                    </Link>
                    <Link className="btn-primary" href={`/adoption/contact/${encodeURIComponent(item.id)}`}>
                      Contact Shelter
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </PublicAccessGuard>
  );
}