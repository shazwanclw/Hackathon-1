import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AuthPage from './page';
import { isUserAdmin, loginWithEmail, loginWithGoogle, registerWithEmail } from '@/lib/auth';
import { setGuestAccess } from '@/lib/access';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock('@/lib/auth', () => ({
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  isUserAdmin: vi.fn(),
}));

vi.mock('@/lib/access', () => ({
  setGuestAccess: vi.fn(),
}));

describe('Public auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login mode by default', () => {
    render(<AuthPage />);
    expect(screen.getByTestId('auth-hero')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole('button', { name: /switch to register/i }));
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('stores guest access and navigates home on guest flow', () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole('button', { name: /join as guest/i }));
    expect(setGuestAccess).toHaveBeenCalledWith(true);
    expect(push).toHaveBeenCalledWith('/');
    expect(loginWithEmail).not.toHaveBeenCalled();
    expect(registerWithEmail).not.toHaveBeenCalled();
  });

  it('logs in with email and password', async () => {
    vi.mocked(loginWithEmail).mockResolvedValue({ user: { uid: 'u-1' } } as never);
    vi.mocked(isUserAdmin).mockResolvedValue(false);
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(loginWithEmail).toHaveBeenCalledWith('user@example.com', 'password123');
      expect(push).toHaveBeenCalledWith('/report');
    });
  });

  it('routes admin account to dashboard after login', async () => {
    vi.mocked(loginWithEmail).mockResolvedValue({ user: { uid: 'admin-1' } } as never);
    vi.mocked(isUserAdmin).mockResolvedValue(true);
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(isUserAdmin).toHaveBeenCalledWith('admin-1');
      expect(push).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('registers with email and password', async () => {
    vi.mocked(registerWithEmail).mockResolvedValue({ user: { uid: 'u-2' } } as never);
    vi.mocked(isUserAdmin).mockResolvedValue(false);
    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: /switch to register/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerWithEmail).toHaveBeenCalledWith('new@example.com', 'password123');
      expect(push).toHaveBeenCalledWith('/report');
    });
  });

  it('allows google sign-in and routes admins to dashboard', async () => {
    vi.mocked(loginWithGoogle).mockResolvedValue({ user: { uid: 'admin-google' } } as never);
    vi.mocked(isUserAdmin).mockResolvedValue(true);
    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(loginWithGoogle).toHaveBeenCalledTimes(1);
      expect(isUserAdmin).toHaveBeenCalledWith('admin-google');
      expect(push).toHaveBeenCalledWith('/admin/dashboard');
    });
  });
});
