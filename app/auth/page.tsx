"use client";

import { FormEvent, useMemo, useState } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { setGuestAccess } from '@/lib/access';
import { isUserAdmin, loginWithEmail, loginWithGoogle, registerWithEmail } from '@/lib/auth';

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
    router.push(admin ? '/admin/dashboard' : '/report');
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
    <section className="mx-auto max-w-md py-6">
      <div className="card-elevated space-y-4">
        <div className="flex gap-2">
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

        <h1 className="font-[var(--font-display)] text-4xl font-semibold text-brand-900">{title}</h1>

        <button className="btn-secondary w-full" type="button" onClick={onGoogleSignIn} disabled={submitting}>
          {submitting ? 'Please wait...' : 'Continue with Google'}
        </button>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <button className="btn-ghost w-full" type="button" onClick={onGuest}>
          Join as Guest
        </button>
      </div>
    </section>
  );
}