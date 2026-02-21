import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FeedPage from './page';
import { listFeedSightings } from '@/lib/data';

vi.mock('@/components/PublicAccessGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/States', () => ({
  LoadingState: ({ text }: { text?: string }) => <div>{text ?? 'Loading...'}</div>,
  ErrorState: ({ text }: { text?: string }) => <div>{text ?? 'Error'}</div>,
}));

vi.mock('@/lib/data', () => ({
  listFeedSightings: vi.fn(),
}));

describe('Feed page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders latest sightings with links to animal profile and map', async () => {
    vi.mocked(listFeedSightings).mockResolvedValue([
      {
        id: 's1',
        animalId: 'a1',
        type: 'cat',
        caption: 'Near the school gate',
        photoUrl: 'https://example.com/cat.jpg',
        createdAtLabel: 'just now',
      },
    ] as never);

    render(<FeedPage />);

    expect(screen.getByRole('heading', { name: /stray feed/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/near the school gate/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /open animal profile/i })).toHaveAttribute('href', '/animal?id=a1');
      expect(screen.getByRole('link', { name: /view on map/i })).toHaveAttribute('href', '/map?animalId=a1');
    });
  });
});
