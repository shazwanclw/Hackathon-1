"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from 'firebase/auth';
import { observeAuth } from '@/lib/auth';
import { hasGuestAccess, onAccessChange } from '@/lib/access';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(hasGuestAccess());
    const unsubAccess = onAccessChange(() => {
      setGuest(hasGuestAccess());
    });
    const unsub = observeAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => {
      unsub();
      unsubAccess();
    };
  }, []);

  return (
    <section className="grid gap-6 py-6 md:grid-cols-2 md:items-center">
      <div className="card-elevated">
        <p className="pill mb-4">SDG 11 Aligned</p>
        <h1 className="font-[var(--font-display)] text-4xl font-bold leading-tight text-brand-900 sm:text-5xl">
          Report stray animals quickly. Help responders act faster.
        </h1>
        <p className="mt-4 page-subtitle">
          StrayLink lets communities submit geotagged reports with AI-assisted animal tagging and gives NGOs a clear workflow from new cases to resolution.
        </p>
        {!user && !guest ? (
          <div className="mt-7 flex gap-3">
            <Link href="/auth" className="btn-primary">Login / Join</Link>
          </div>
        ) : null}
      </div>
      <div className="card p-6">
        <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Citizen uploads photo and picks location on the map.</li>
          <li>TensorFlow.js classifies likely animal type in browser.</li>
          <li>Case enters admin workflow: new, verified, assigned, resolved/rejected.</li>
          <li>Citizen tracks status with case ID + tracking token.</li>
        </ol>
      </div>
    </section>
  );
}