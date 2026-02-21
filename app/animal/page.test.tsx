import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AnimalProfilePage from './page';
import { getAnimalById, listAnimalSightings } from '@/lib/data';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('id=animal-1'),
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
  getAnimalById: vi.fn(),
  listAnimalSightings: vi.fn(),
}));

describe('Animal profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders animal details and sightings timeline', async () => {
    vi.mocked(getAnimalById).mockResolvedValue({
      id: 'animal-1',
      type: 'dog',
      coverPhotoUrl: 'https://example.com/dog.jpg',
      lastSeenAtLabel: 'just now',
      sightingCount: 1,
    } as never);

    vi.mocked(listAnimalSightings).mockResolvedValue([
      {
        id: 's1',
        caption: 'Near market',
        photoUrl: 'https://example.com/s1.jpg',
        createdAtLabel: 'just now',
        locationLabel: '10.11, 20.22',
      },
    ] as never);

    render(<AnimalProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /animal profile/i })).toBeInTheDocument();
      expect(screen.getByText(/type: dog/i)).toBeInTheDocument();
      expect(screen.getByText(/near market/i)).toBeInTheDocument();
    });
  });
});
