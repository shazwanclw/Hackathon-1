"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <section className="py-2">
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
  );
}
