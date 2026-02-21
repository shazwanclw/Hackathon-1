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
    links.push({ href: '/map', label: 'Map' });
  }

  if (admin) {
    links.push({ href: '/admin/dashboard', label: 'Admin' });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-shell flex h-14 items-center justify-between">
        <Link href="/" className="text-lg font-bold text-brand-700">
          StrayLink
        </Link>
        <nav className="flex items-center gap-2">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm ${active ? 'bg-brand-100 text-brand-900' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {item.label}
              </Link>
            );
          })}
          {!user && !guest ? (
            <Link
              href="/auth"
              className={`rounded-md px-3 py-1.5 text-sm ${pathname === '/auth' ? 'bg-brand-100 text-brand-900' : 'text-slate-600 hover:bg-slate-100'}`}
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
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              {user ? 'Logout' : 'Exit Guest'}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
