import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {},
}));

import { buildLostFoundPostPayload, mapLostFoundDocToPost } from '@/lib/data';

describe('lost found data helpers', () => {
  it('builds payload with locationText and normalized photos', () => {
    const payload = buildLostFoundPostPayload({
      createdBy: 'user-1',
      authorEmail: 'user@example.com',
      petName: 'Milo',
      description: 'Black collar',
      contactInfo: '555-0101',
      locationText: 'Downtown',
      photoUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      photoPaths: ['lost_found/id/a.jpg', 'lost_found/id/b.jpg'],
    });

    expect(payload).toMatchObject({
      createdBy: 'user-1',
      authorEmail: 'user@example.com',
      petName: 'Milo',
      description: 'Black collar',
      contactInfo: '555-0101',
      locationText: 'Downtown',
      photoUrl: 'https://example.com/a.jpg',
      photoUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      photoPaths: ['lost_found/id/a.jpg', 'lost_found/id/b.jpg'],
    });
  });

  it('maps firestore doc into LostFoundPost with locationText fallback', () => {
    const post = mapLostFoundDocToPost('post-1', {
      createdBy: 'user-1',
      authorEmail: 'user@example.com',
      petName: 'Milo',
      description: 'Black collar',
      contactInfo: '555-0101',
      locationText: 'Downtown',
      photoUrl: 'https://example.com/a.jpg',
      photoUrls: ['https://example.com/a.jpg'],
      createdAt: { toDate: () => new Date('2026-02-26T10:00:00Z') },
    });

    expect(post).toMatchObject({
      id: 'post-1',
      petName: 'Milo',
      locationText: 'Downtown',
      photoUrl: 'https://example.com/a.jpg',
    });
  });
});
