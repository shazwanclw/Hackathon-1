import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {},
}));

import { buildNewCasePayload } from '@/lib/data';

describe('case payload builders', () => {
  it('builds a new case payload with tfjs ai fields and default triage metadata', () => {
    const payload = buildNewCasePayload({
      animalId: 'animal-1',
      createdBy: 'user-1',
      trackingToken: 'track-token-1',
      photo: {
        storagePath: 'cases/case-1/photo.jpg',
        downloadUrl: 'https://example.com/photo.jpg',
      },
      location: { lat: 1.23, lng: 4.56 },
      note: 'Near bus stop',
      ai: {
        animalType: 'dog',
        confidence: 0.91,
        rawTopLabel: 'golden retriever',
      },
    });

    expect(payload).toMatchObject({
      animalId: 'animal-1',
      createdBy: 'user-1',
      trackingToken: 'track-token-1',
      photo: {
        storagePath: 'cases/case-1/photo.jpg',
        downloadUrl: 'https://example.com/photo.jpg',
      },
      location: {
        lat: 1.23,
        lng: 4.56,
        addressText: '',
        accuracy: 'exact',
      },
      report: {
        count: '1',
        behavior: 'unknown',
        immediateDanger: false,
        note: 'Near bus stop',
      },
      ai: {
        model: 'tfjs-mobilenet',
        animalType: 'dog',
        confidence: 0.91,
        rawTopLabel: 'golden retriever',
      },
      triage: {
        urgency: 'medium',
        reason: 'Pending human verification.',
        needsHumanVerification: true,
      },
      status: 'new',
      assignedTo: null,
      resolution: null,
    });
  });
});
