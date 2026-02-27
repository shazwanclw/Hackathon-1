import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AnimalProfilePage from './page';
import { getAnimalById, listAnimalSightings } from '@/lib/data';

let queryString = 'id=animal-1';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(queryString),
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
    queryString = 'id=animal-1';
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

  it('renders clickable timeline items with latest vs previous distinction', async () => {
    vi.mocked(getAnimalById).mockResolvedValue({
      id: 'animal-1',
      type: 'dog',
      coverPhotoUrl: 'https://example.com/dog.jpg',
      lastSeenAtLabel: 'just now',
      sightingCount: 2,
    } as never);

    vi.mocked(listAnimalSightings).mockResolvedValue([
      {
        id: 's2',
        caption: 'Latest at bus stop',
        photoUrl: 'https://example.com/s2.jpg',
        createdAtLabel: 'now',
        locationLabel: '11.11, 22.22',
      },
      {
        id: 's1',
        caption: 'Previous near market',
        photoUrl: 'https://example.com/s1.jpg',
        createdAtLabel: 'earlier',
        locationLabel: '10.11, 20.22',
      },
    ] as never);

    render(<AnimalProfilePage />);

    const latestLink = await screen.findByRole('link', { name: /open sighting s2/i });
    const previousLink = await screen.findByRole('link', { name: /open sighting s1/i });

    expect(latestLink).toHaveAttribute('href', '/animal?id=animal-1&sightingId=s2');
    expect(previousLink).toHaveAttribute('href', '/animal?id=animal-1&sightingId=s1');
    expect(screen.getAllByText('Latest Sighting').length).toBeGreaterThan(0);
    expect(screen.getByText('Previous sighting')).toBeInTheDocument();
  });

  it('shows focused previous sighting context when sightingId is selected', async () => {
    queryString = 'id=animal-1&sightingId=s1';

    vi.mocked(getAnimalById).mockResolvedValue({
      id: 'animal-1',
      type: 'dog',
      coverPhotoUrl: 'https://example.com/dog.jpg',
      lastSeenAtLabel: 'just now',
      sightingCount: 2,
    } as never);

    vi.mocked(listAnimalSightings).mockResolvedValue([
      {
        id: 's2',
        caption: 'Latest at bus stop',
        photoUrl: 'https://example.com/s2.jpg',
        createdAtLabel: 'now',
        locationLabel: '11.11, 22.22',
      },
      {
        id: 's1',
        caption: 'Previous near market',
        photoUrl: 'https://example.com/s1.jpg',
        createdAtLabel: 'earlier',
        locationLabel: '10.11, 20.22',
      },
    ] as never);

    render(<AnimalProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Viewing Sighting Location')).toBeInTheDocument();
      expect(screen.getByText('Current: Previous sighting')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });
});
