import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';
import { observeAuth } from '@/lib/auth';
import { hasGuestAccess, onAccessChange } from '@/lib/access';

vi.mock('@/lib/auth', () => ({
  observeAuth: vi.fn(),
}));

vi.mock('@/lib/access', () => ({
  hasGuestAccess: vi.fn(),
  onAccessChange: vi.fn(() => () => {}),
}));

describe('Home page', () => {
  it('shows only login/join call to action', () => {
    vi.mocked(hasGuestAccess).mockReturnValue(false);
    vi.mocked(onAccessChange).mockReturnValue(() => {});
    vi.mocked(observeAuth).mockImplementation((cb) => {
      cb(null);
      return () => {};
    });
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /login \/ join/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /submit a report/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin login/i })).not.toBeInTheDocument();
  });

  it('hides login/join when user is signed in', () => {
    vi.mocked(hasGuestAccess).mockReturnValue(false);
    vi.mocked(onAccessChange).mockReturnValue(() => {});
    vi.mocked(observeAuth).mockImplementation((cb) => {
      cb({ uid: 'u-1' } as never);
      return () => {};
    });
    render(<HomePage />);
    expect(screen.queryByRole('link', { name: /login \/ join/i })).not.toBeInTheDocument();
  });

  it('hides login/join when guest access exists', () => {
    vi.mocked(hasGuestAccess).mockReturnValue(true);
    vi.mocked(onAccessChange).mockReturnValue(() => {});
    vi.mocked(observeAuth).mockImplementation((cb) => {
      cb(null);
      return () => {};
    });
    render(<HomePage />);
    expect(screen.queryByRole('link', { name: /login \/ join/i })).not.toBeInTheDocument();
  });
});
