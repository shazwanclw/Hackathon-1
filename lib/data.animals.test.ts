import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {},
}));

import { buildNewAnimalPayload, buildNewSightingPayload } from '@/lib/data';

describe('animal thread payload builders', () => {
  it('builds a new animal payload with last seen fields from first sighting', () => {
    const payload = buildNewAnimalPayload({
      type: 'cat',
      caption: 'Near the park gate',
      photoUrl: 'https://example.com/p.jpg',
      location: { lat: 40.1, lng: -73.9 },
      authorUid: 'user-1',
      photoPath: 'animals/a1/sightings/s1.jpg',
    });

    expect(payload).toMatchObject({
      type: 'cat',
      createdBy: 'user-1',
      coverPhotoUrl: 'https://example.com/p.jpg',
      lastSeenAt: null,
      lastSeenLocation: { lat: 40.1, lng: -73.9 },
      sightingCount: 1,
      latestSightingCaption: 'Near the park gate',
      latestSightingPhotoPath: 'animals/a1/sightings/s1.jpg',
    });
  });

  it('builds a new sighting payload with required fields', () => {
    const payload = buildNewSightingPayload({
      animalId: 'animal-1',
      type: 'dog',
      caption: 'Sleeping by storefront',
      photoUrl: 'https://example.com/d.jpg',
      photoPath: 'animals/animal-1/sightings/abc.jpg',
      location: { lat: 12.34, lng: 56.78 },
      authorUid: 'user-2',
    });

    expect(payload).toMatchObject({
      animalId: 'animal-1',
      type: 'dog',
      caption: 'Sleeping by storefront',
      photoUrl: 'https://example.com/d.jpg',
      photoPath: 'animals/animal-1/sightings/abc.jpg',
      location: { lat: 12.34, lng: 56.78 },
      authorUid: 'user-2',
      commentCount: 0,
      createdAt: null,
    });
  });
});
