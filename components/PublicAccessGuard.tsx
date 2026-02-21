"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { LoadingState } from '@/components/States';
import { observeAuth } from '@/lib/auth';
import { hasGuestAccess } from '@/lib/access';

export default function PublicAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    const guest = hasGuestAccess();
    if (guest) {
      setState('allowed');
      return () => {};
    }

    const unsub = observeAuth((user: User | null) => {
      if (user) {
        setState('allowed');
        return;
      }
      setState('blocked');
      router.replace('/');
    });

    return () => unsub();
  }, [router]);

  if (state === 'loading') return <LoadingState text="Checking access..." />;
  if (state === 'blocked') return null;
  return <>{children}</>;
}
