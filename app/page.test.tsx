import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';
import { observeAuth } from '@/lib/auth';
import { hasGuestAccess, onAccessChange } from '@/lib/access';
import { listAnimalMapMarkers } from '@/lib/data';

vi.mock('@/lib/auth', () => ({
  observeAuth: vi.fn(),
}));

vi.mock('@/lib/access', () => ({
  hasGuestAccess: vi.fn(),
  onAccessChange: vi.fn(() => () => {}),
}));

vi.mock('@/lib/data', () => ({
  listAnimalMapMarkers: vi.fn(),
}));

vi.mock('@/components/HomeMapPreview', () => ({
  default: () => <div data-testid="home-map-preview">Map preview</div>,
}));

describe('Home page', () => {
  it('shows only login/join call to action', async () => {
    vi.mocked(listAnimalMapMarkers).mockResolvedValue([] as never);
    vi.mocked(hasGuestAccess).mockReturnValue(false);
    vi.mocked(onAccessChange).mockReturnValue(() => {});
    vi.mocked(observeAuth).mockImplementation((cb) => {
      cb(null);
      return () => {};
    });
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByTestId('home-hero')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login \/ join/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /submit a report/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /admin login/i })).not.toBeInTheDocument();
    });
  });

  it('hides login/join when user is signed in', async () => {
    vi.mocked(listAnimalMapMarkers).mockResolvedValue([] as never);
    vi.mocked(hasGuestAccess).mockReturnValue(false);
    vi.mocked(onAccessChange).mockReturnValue(() => {});
    vi.mocked(observeAuth).mockImplementation((cb) => {
      cb({ uid: 'u-1' } as never);
      return () => {};
    });
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByTestId('home-hero')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /login \/ join/i })).not.toBeInTheDocument();
      expect(screen.getByText(/how it works\?/i)).toBeInTheDocument();
      expect(screen.getByText(/snap!/i)).toBeInTheDocument();
      expect(screen.getByText(/upload!/i)).toBeInTheDocument();
      expect(screen.getByText(/help the community!/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /open community map/i })).toHaveAttribute('href', '/map');
    });
  });

  it('hides login/join when guest access exists', async () => {
    vi.mocked(listAnimalMapMarkers).mockResolvedValue([] as never);
    vi.mocked(hasGuestAccess).mockReturnValue(true);
    vi.mocked(onAccessChange).mockReturnValue(() => {});
    vi.mocked(observeAuth).mockImplementation((cb) => {
      cb(null);
      return () => {};
    });
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /login \/ join/i })).not.toBeInTheDocument();
    });
  });
});
