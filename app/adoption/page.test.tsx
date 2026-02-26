import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from 'firebase/auth';
import AdoptionPage from './page';
import { listAdoptionPosts } from '@/lib/data';
import { isUserAdmin, isUserShelter, observeAuth } from '@/lib/auth';

vi.mock('@/components/PublicAccessGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/States', () => ({
  LoadingState: ({ text }: { text?: string }) => <div>{text ?? 'Loading...'}</div>,
  ErrorState: ({ text }: { text?: string }) => <div>{text ?? 'Error'}</div>,
  EmptyState: ({ text }: { text?: string }) => <div>{text ?? 'Empty'}</div>,
}));

vi.mock('@/lib/data', () => ({
  listAdoptionPosts: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  observeAuth: vi.fn(),
  isUserAdmin: vi.fn(),
  isUserShelter: vi.fn(),
}));

describe('Adoption page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observeAuth).mockImplementation((cb: (user: User | null) => void) => {
      cb({ uid: 'viewer-1', email: 'viewer@example.com' } as User);
      return () => {};
    });
    vi.mocked(isUserAdmin).mockResolvedValue(false);
    vi.mocked(isUserShelter).mockResolvedValue(false);
  });

  it('renders adoptable posts and contact shelter links', async () => {
    vi.mocked(listAdoptionPosts).mockResolvedValue([
      {
        id: 'ad-1',
        petName: 'Milo',
        petType: 'dog',
        ageText: '2 years',
        description: 'Friendly and vaccinated',
        photoUrl: 'https://example.com/milo.jpg',
        shelterName: 'Paws Shelter',
        contactEmail: 'paws@example.org',
        phone: '+1 555 1234',
        address: '12 Main St',
        status: 'available',
        createdAtLabel: 'Just now',
      },
    ] as never);

    render(<AdoptionPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /adoption center/i })).toBeInTheDocument();
      expect(screen.getByText(/milo/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /contact shelter/i })).toHaveAttribute('href', '/adoption/contact/ad-1');
    });
  });

  it('shows create post action for shelter role', async () => {
    vi.mocked(listAdoptionPosts).mockResolvedValue([] as never);
    vi.mocked(isUserShelter).mockResolvedValue(true);

    render(<AdoptionPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /create post/i })).toHaveAttribute('href', '/adoption/new');
    });
  });
});