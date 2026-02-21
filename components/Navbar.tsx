"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/auth', label: 'Login' },
  { href: '/report', label: 'Report' },
  { href: '/admin/dashboard', label: 'Admin' },
  { href: '/admin/map', label: 'Map' },
];

export default function Navbar() {
  const pathname = usePathname();

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
        </nav>
      </div>
    </header>
  );
}
