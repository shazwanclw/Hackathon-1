"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { hasGuestAccess, onAccessChange, setGuestAccess } from '@/lib/access';
import { isUserAdmin, logout, observeAuth } from '@/lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(hasGuestAccess());
    const unsubAccess = onAccessChange(() => {
      setGuest(hasGuestAccess());
    });
    const unsub = observeAuth(async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setAdmin(false);
        setGuest(hasGuestAccess());
        return;
      }
      const allowed = await isUserAdmin(currentUser.uid);
      setAdmin(allowed);
    });

    return () => {
      unsub();
      unsubAccess();
    };
  }, []);

  const links = [{ href: '/', label: 'Home' }];

  if (user || guest) {
    links.push({ href: '/report', label: 'Report' });
    links.push({ href: '/feed', label: 'Feed' });
    links.push({ href: '/map', label: 'Map' });
  }
  if (user) {
    links.push({ href: '/profile', label: 'Profile' });
  }
  if (admin) {
    links.push({ href: '/admin/dashboard', label: 'Admin' });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-brand-300/80 bg-[rgba(255,247,230,0.92)] backdrop-blur-md">
      <div className="container-shell flex min-h-16 items-center justify-between gap-3 py-2">
        <Link href="/" className="font-[var(--font-display)] text-3xl font-semibold tracking-tight text-brand-900">
          StrayLink
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'segment-active' : 'segment'}
              >
                {item.label}
              </Link>
            );
          })}
          {!user && !guest ? (
            <Link
              href="/auth"
              className={pathname === '/auth' ? 'segment-active' : 'segment'}
            >
              Login
            </Link>
          ) : null}
          {user || guest ? (
            <button
              type="button"
              onClick={async () => {
                setGuestAccess(false);
                if (user) {
                  await logout();
                }
                setGuest(false);
                setAdmin(false);
                router.push('/');
              }}
              className="btn-ghost"
            >
              {user ? 'Logout' : 'Exit Guest'}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
