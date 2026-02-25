"use client";

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'firebase/auth';
import { observeAuth } from '@/lib/auth';
import { hasGuestAccess, onAccessChange } from '@/lib/access';
import { listAnimalMapMarkers } from '@/lib/data';
import { AnimalMapMarker } from '@/lib/types';

const HomeMapPreview = dynamic(() => import('@/components/HomeMapPreview'), { ssr: false });

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);
  const [mapItems, setMapItems] = useState<AnimalMapMarker[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');

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

  useEffect(() => {
    if (!user && !guest) return;
    let cancelled = false;

    async function run() {
      setMapLoading(true);
      setMapError('');
      try {
        const rows = await listAnimalMapMarkers();
        if (!cancelled) setMapItems(rows);
      } catch {
        if (!cancelled) setMapError('Unable to load map preview.');
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user, guest]);

  return (
    <div className="space-y-8 py-2">
      <section>
        <div data-testid="home-hero" className="hero-shell min-h-[72vh]">
          <Image src="/images/hero-cat.jpeg" alt="" fill priority className="hero-image" />
          <div className="hero-tint" />
          <div className="hero-content flex min-h-[72vh] items-end lg:items-center">
            <div className="ml-auto w-full max-w-[42rem] text-white">
              <h1 className="font-[var(--font-body)] text-5xl font-extrabold leading-[1.03] drop-shadow-sm sm:text-6xl">
                Report stray animals quickly. Help responders act faster.
              </h1>
              <p className="mt-5 max-w-[40rem] text-xl leading-tight text-honey-50/95">
                StrayLink helps communities submit geotagged reports so NGOs and responders can triage cases fast.
              </p>
              {!user && !guest ? (
                <div className="mt-8 flex justify-end">
                  <Link href="/auth" className="btn-primary text-3xl leading-none sm:text-[2rem]">
                    Login / Join
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {user || guest ? (
        <section className="card-elevated grid gap-6 p-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="font-[var(--font-display)] text-5xl font-semibold text-brand-900">How it Works?</h2>
            <div className="mt-5 space-y-4">
              {[
                'Snap!',
                'Upload!',
                'Help the Community!',
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-3 text-brand-900">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-900 text-lg font-semibold text-honey-50">
                    {index + 1}
                  </div>
                  <p className="text-2xl font-medium leading-tight">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <Link href="/map" className="group block" aria-label="Open community map">
            {mapLoading ? (
              <div className="card flex h-[44vh] items-center justify-center text-sm text-muted">Loading map preview...</div>
            ) : null}
            {!mapLoading && mapError ? (
              <div className="card flex h-[44vh] items-center justify-center text-sm text-muted">{mapError}</div>
            ) : null}
            {!mapLoading && !mapError ? <HomeMapPreview cases={mapItems} /> : null}
            <p className="mt-2 text-xs text-muted group-hover:text-brand-800">Click map to open Community Map</p>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
