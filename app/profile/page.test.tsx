import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import { getUserProfileSummary, isFollowingUser, listUserFeedSightings } from '@/lib/data';
import { observeAuth } from '@/lib/auth';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('uid=user-1'),
}));

vi.mock('@/components/PublicAccessGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/States', () => ({
  LoadingState: ({ text }: { text?: string }) => <div>{text ?? 'Loading...'}</div>,
  ErrorState: ({ text }: { text?: string }) => <div>{text ?? 'Error'}</div>,
  EmptyState: ({ text }: { text?: string }) => <div>{text ?? 'Empty'}</div>,
}));

vi.mock('@/lib/data', () => ({
  getUserProfileSummary: vi.fn(),
  listUserFeedSightings: vi.fn(),
  isFollowingUser: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  saveUserProfile: vi.fn(),
  uploadUserProfilePhoto: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  observeAuth: vi.fn((cb: (user: unknown) => void) => {
    cb(null);
    return () => {};
  }),
}));

describe('Profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observeAuth).mockImplementation(((cb: (user: unknown) => void) => {
      cb(null);
      return () => {};
    }) as never);
  });

  it('renders reporter email and submitted reports', async () => {
    vi.mocked(getUserProfileSummary).mockResolvedValue({
      uid: 'user-1',
      email: 'user-1@gmail.com',
      reportCount: 1,
      username: 'zaidi',
      photoURL: 'https://example.com/avatar.jpg',
      followersCount: 9,
      followingCount: 2,
    } as never);
    vi.mocked(isFollowingUser).mockResolvedValue(false);

    vi.mocked(listUserFeedSightings).mockResolvedValue([
      {
        id: 'animal-1',
        animalId: 'animal-1',
        reporterUid: 'user-1',
        reporterEmail: 'user-1@gmail.com',
        reporterUsername: 'zaidi',
        reporterPhotoURL: 'https://example.com/avatar.jpg',
        type: 'dog',
        caption: 'Sleeping near bus stop',
        photoUrl: 'https://example.com/dog.jpg',
        photoUrls: ['https://example.com/dog.jpg'],
        createdAtLabel: 'just now',
      },
    ] as never);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user profile/i })).toBeInTheDocument();
      expect(screen.getByText(/zaidi/i)).toBeInTheDocument();
      expect(screen.getByText(/user-1@gmail.com/i)).toBeInTheDocument();
      expect(screen.getByText(/^followers$/i)).toBeInTheDocument();
      expect(screen.getByText(/^following$/i)).toBeInTheDocument();
      expect(screen.getByText(/^9$/)).toBeInTheDocument();
      expect(screen.getByText(/^2$/)).toBeInTheDocument();
      expect(screen.getByText(/sleeping near bus stop/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /open animal profile/i })).toHaveAttribute('href', '/animal?id=animal-1');
      expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument();
    });
  });
});
