import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { User } from 'firebase/auth';
import FeedPage from './page';
import { addCommentToAnimalFeed, listFeedSightings, toggleLikeInAnimalFeed } from '@/lib/data';
import { observeAuth } from '@/lib/auth';

vi.mock('@/components/PublicAccessGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/States', () => ({
  LoadingState: ({ text }: { text?: string }) => <div>{text ?? 'Loading...'}</div>,
  ErrorState: ({ text }: { text?: string }) => <div>{text ?? 'Error'}</div>,
}));

vi.mock('@/lib/data', () => ({
  listFeedSightings: vi.fn(),
  toggleLikeInAnimalFeed: vi.fn(),
  addCommentToAnimalFeed: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  observeAuth: vi.fn((cb: (user: User | null) => void) => {
    cb({ uid: 'viewer-1', email: 'viewer@example.com' } as User);
    return () => {};
  }),
}));

describe('Feed page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observeAuth).mockImplementation((cb: (user: User | null) => void) => {
      cb({ uid: 'viewer-1', email: 'viewer@example.com' } as User);
      return () => {};
    });
  });

  it('renders social feed card and supports like/comment actions', async () => {
    vi.mocked(listFeedSightings).mockResolvedValue([
      {
        id: 's1',
        animalId: 'a1',
        reporterUid: 'u-1',
        reporterEmail: 'reporter@example.com',
        reporterUsername: 'zaidi',
        reporterPhotoURL: 'https://example.com/u-1.jpg',
        type: 'cat',
        caption: 'Near the school gate',
        photoUrl: 'https://example.com/cat.jpg',
        photoUrls: [
          'https://example.com/cat-1.jpg',
          'https://example.com/cat-2.jpg',
          'https://example.com/cat-3.jpg',
        ],
        createdAtLabel: 'just now',
        aiRiskUrgency: 'high',
        likeCount: 1,
        commentCount: 1,
        likedByMe: false,
        comments: [
          {
            id: 'c-1',
            authorUid: 'u-9',
            authorEmail: 'friend@example.com',
            content: 'please rescue soon',
            createdAtLabel: 'now',
          },
        ],
      },
    ] as never);
    vi.mocked(toggleLikeInAnimalFeed).mockResolvedValue(undefined as never);
    vi.mocked(addCommentToAnimalFeed).mockResolvedValue(undefined as never);

    render(<FeedPage />);

    expect(screen.getByRole('heading', { name: /stray feed/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/zaidi/i)).toBeInTheDocument();
      expect(screen.getByText(/reporter@example.com/i)).toBeInTheDocument();
      expect(screen.queryByText(/reported by:/i)).not.toBeInTheDocument();
      expect(screen.getByText(/near the school gate/i)).toBeInTheDocument();
      expect(screen.getByText(/urgency level/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /see ai health scan/i })).toHaveAttribute('href', '/animal?id=a1');
      expect(screen.getByRole('link', { name: /open animal profile/i })).toHaveAttribute('href', '/animal?id=a1');
      expect(screen.getByRole('link', { name: /view on map/i })).toHaveAttribute('href', '/map?animalId=a1');
      expect(screen.getAllByAltText(/cat sighting/i)).toHaveLength(1);
      expect(screen.getByRole('button', { name: /previous photo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next photo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /comment/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /like/i }));
    await waitFor(() => {
      expect(toggleLikeInAnimalFeed).toHaveBeenCalledWith('a1', 'viewer-1', false);
    });

    fireEvent.click(screen.getByRole('button', { name: /comment/i }));
    fireEvent.change(screen.getByPlaceholderText(/add a comment/i), { target: { value: 'hello there' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));
    await waitFor(() => {
      expect(addCommentToAnimalFeed).toHaveBeenCalledWith('a1', 'viewer-1', 'viewer@example.com', 'hello there');
    });
  });
});
