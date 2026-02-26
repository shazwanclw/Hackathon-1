"use client";

import { FormEvent, useMemo, useState } from 'react';
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { setGuestAccess } from '@/lib/access';
import { isUserAdmin, isUserShelter, loginWithEmail, loginWithGoogle, registerWithEmail } from '@/lib/auth';

type Mode = 'login' | 'register';

function mapErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('email-already-in-use')) return 'This email is already registered.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid email or password.';
  }
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  return 'Authentication failed. Please try again.';
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const title = useMemo(
    () => (mode === 'login' ? 'Welcome Back' : 'Create Your Account'),
    [mode]
  );

  async function routeByRole(uid: string) {
    setGuestAccess(false);
    const admin = await isUserAdmin(uid);
    if (admin) {
      router.push('/admin/dashboard');
      return;
    }
    const shelter = await isUserShelter(uid);
    router.push(shelter ? '/adoption' : '/report');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (mode === 'login') {
        const result = await loginWithEmail(email, password);
        await routeByRole(result.user.uid);
      } else {
        const result = await registerWithEmail(email, password);
        await routeByRole(result.user.uid);
      }
    } catch (err) {
      setError(mapErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogleSignIn() {
    setSubmitting(true);
    setError('');
    try {
      const result = await loginWithGoogle();
      await routeByRole(result.user.uid);
    } catch (err) {
      setError(mapErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onGuest() {
    setGuestAccess(true);
    router.push('/');
  }

  return (
    <section className="py-2">
      <div data-testid="auth-hero" className="hero-shell min-h-[72vh]">
        <Image src="/images/hero-cat.jpeg" alt="" fill priority className="hero-image" />
        <div className="hero-tint bg-[linear-gradient(90deg,rgba(25,18,12,0.5)_0%,rgba(25,18,12,0.7)_52%,rgba(25,18,12,0.78)_100%)]" />
        <div className="hero-content flex min-h-[72vh] items-center justify-end">
          <div className="w-full max-w-xl rounded-[2rem] border border-honey-100/25 bg-[rgba(95,77,56,0.9)] p-7 text-white shadow-[0_22px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8">
            <div className="mb-5 flex gap-3">
              <button
                type="button"
                aria-label="Switch to login"
                className={mode === 'login' ? 'segment-active' : 'segment'}
                onClick={() => setMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                aria-label="Switch to register"
                className={mode === 'register' ? 'segment-active' : 'segment'}
                onClick={() => setMode('register')}
              >
                Register
              </button>
            </div>

            <h1 className="font-[var(--font-body)] text-5xl font-semibold leading-tight text-white">{title}</h1>

            <button className="btn-secondary mt-5 w-full border-brand-100/40 bg-[#f2e4be] text-xl font-semibold text-brand-900" type="button" onClick={onGoogleSignIn} disabled={submitting}>
              {submitting ? 'Please wait...' : 'Continue with Google'}
            </button>

            <form className="mt-5 space-y-3" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label htmlFor="email" className="label text-white">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input border-white/45 bg-white/10 text-lg text-white placeholder:text-white/70"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="label text-white">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input border-white/45 bg-white/10 text-lg text-white placeholder:text-white/70"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              {error ? <p className="text-sm text-rose-200">{error}</p> : null}
              <button className="btn-primary w-full bg-brand-800 text-2xl font-semibold text-white sm:text-3xl" type="submit" disabled={submitting}>
                {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            <button className="btn-ghost mt-4 w-full border-white/40 bg-white text-xl font-semibold text-brand-900 sm:text-2xl" type="button" onClick={onGuest}>
              Join as Guest
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
