import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from 'firebase/auth';
import Navbar from './Navbar';
import { hasGuestAccess, onAccessChange } from '@/lib/access';
import { isUserAdmin, observeAuth } from '@/lib/auth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/access', () => ({
  hasGuestAccess: vi.fn(),
  onAccessChange: vi.fn(() => () => {}),
  setGuestAccess: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  observeAuth: vi.fn(),
  isUserAdmin: vi.fn(),
  logout: vi.fn(),
}));

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onAccessChange).mockReturnValue(() => {});
    vi.mocked(isUserAdmin).mockResolvedValue(false);
  });

  it('shows adoption link after feed for authenticated users', async () => {
    vi.mocked(hasGuestAccess).mockReturnValue(false);
    vi.mocked(observeAuth).mockImplementation((cb: (user: User | null) => void) => {
      cb({ uid: 'u-1', email: 'u1@example.com' } as User);
      return () => {};
    });

    const { container } = render(<Navbar />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /adoption/i })).toHaveAttribute('href', '/adoption');
    });

    const navText = container.querySelector('nav')?.textContent ?? '';
    expect(navText.indexOf('Feed')).toBeGreaterThan(-1);
    expect(navText.indexOf('Adoption')).toBeGreaterThan(navText.indexOf('Feed'));
  });

  it('shows adoption link for guest users', async () => {
    vi.mocked(hasGuestAccess).mockReturnValue(true);
    vi.mocked(observeAuth).mockImplementation((cb: (user: User | null) => void) => {
      cb(null);
      return () => {};
    });

    render(<Navbar />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /adoption/i })).toHaveAttribute('href', '/adoption');
      expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument();
    });
  });

  it('uses the styled top navigation shell', async () => {
    vi.mocked(hasGuestAccess).mockReturnValue(false);
    vi.mocked(observeAuth).mockImplementation((cb: (user: User | null) => void) => {
      cb(null);
      return () => {};
    });

    render(<Navbar />);

    await waitFor(() => {
      const banner = screen.getByRole('banner');
      expect(banner.className).toContain('top-nav');
    });
  });
});
