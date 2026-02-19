"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { observeAuth, isUserAdmin, loginWithGoogle, logout } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = observeAuth(async (user) => {
      if (!user) {
        setChecking(false);
        return;
      }
      const admin = await isUserAdmin(user.uid);
      if (admin) {
        router.replace('/admin/dashboard');
      } else {
        setChecking(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function signIn() {
    try {
      setLoading(true);
      const result = await loginWithGoogle();
      const admin = await isUserAdmin(result.user.uid);
      if (!admin) {
        toast.error('Not authorized. Add this UID to admins collection.');
        await logout();
        return;
      }
      router.replace('/admin/dashboard');
    } catch {
      toast.error('Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="card space-y-4 p-5">
        <h1 className="text-xl font-bold">Admin Login</h1>
        <p className="text-sm text-slate-600">Sign in with Google. Access is allowed only if your UID exists in `admins/{'{uid}'}` with `enabled: true`.</p>
        <button className="btn-primary w-full" disabled={loading || checking} onClick={signIn}>
          {loading || checking ? 'Please wait...' : 'Sign in with Google'}
        </button>
      </div>
    </section>
  );
}
