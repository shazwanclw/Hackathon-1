"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { observeAuth, isUserAdmin } from '@/lib/auth';
import { LoadingState, ErrorState } from '@/components/States';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    const unsub = observeAuth(async (user: User | null) => {
      if (!user) {
        router.replace('/admin/login');
        setState('blocked');
        return;
      }

      const admin = await isUserAdmin(user.uid);
      if (!admin) {
        toast.error('You are signed in but not in admins collection.');
        setState('blocked');
        router.replace('/admin/login');
        return;
      }
      setState('allowed');
    });

    return () => unsub();
  }, [router]);

  if (state === 'loading') return <LoadingState text="Checking admin access..." />;
  if (state === 'blocked') return <ErrorState text="Admin access required." />;
  return <>{children}</>;
}
