import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AuthPage from './page';
import { loginWithEmail, registerWithEmail } from '@/lib/auth';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock('@/lib/auth', () => ({
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
}));

describe('Public auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login mode by default', () => {
    render(<AuthPage />);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole('button', { name: /switch to register/i }));
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('navigates to report page on guest flow', () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole('button', { name: /join as guest/i }));
    expect(push).toHaveBeenCalledWith('/report');
    expect(loginWithEmail).not.toHaveBeenCalled();
    expect(registerWithEmail).not.toHaveBeenCalled();
  });

  it('logs in with email and password', async () => {
    vi.mocked(loginWithEmail).mockResolvedValue({} as never);
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(loginWithEmail).toHaveBeenCalledWith('user@example.com', 'password123');
      expect(push).toHaveBeenCalledWith('/report');
    });
  });

  it('registers with email and password', async () => {
    vi.mocked(registerWithEmail).mockResolvedValue({} as never);
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
});
