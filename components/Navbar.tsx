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
    links.push({ href: '/report', label: 'Post' });
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
    <header className="sticky top-0 z-30 bg-[rgba(239,226,194,0.94)] backdrop-blur-sm">
      <div className="container-shell flex min-h-16 items-center justify-between gap-3 py-4">
        <Link href="/" className="logo-mark">
          StrayLink
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'nav-pill-active' : 'nav-pill'}
              >
                {item.label}
              </Link>
            );
          })}
          {!user && !guest ? (
            <Link
              href="/auth"
              className={pathname === '/auth' ? 'nav-pill-active' : 'nav-pill'}
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
