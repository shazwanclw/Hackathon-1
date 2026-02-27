import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  functions: {},
}));
import { pickAutoSightingAnimalId } from '@/lib/lostFoundAi';

describe('pickAutoSightingAnimalId', () => {
  it('returns top match id when score meets threshold', () => {
    const result = pickAutoSightingAnimalId(
      [
        { animalId: 'a-1', score: 0.91, reason: 'strong fur pattern overlap', type: 'cat', coverPhotoUrl: '', lastSeenLocation: null, reporterEmail: '' },
        { animalId: 'a-2', score: 0.72, reason: 'similar color', type: 'cat', coverPhotoUrl: '', lastSeenLocation: null, reporterEmail: '' },
      ],
      0.85
    );

    expect(result).toBe('a-1');
  });

  it('returns null when top score is below threshold', () => {
    const result = pickAutoSightingAnimalId(
      [{ animalId: 'a-1', score: 0.79, reason: 'partial similarity', type: 'dog', coverPhotoUrl: '', lastSeenLocation: null, reporterEmail: '' }],
      0.85
    );

    expect(result).toBeNull();
  });

  it('returns null when no matches are available', () => {
    expect(pickAutoSightingAnimalId([], 0.85)).toBeNull();
  });
});
