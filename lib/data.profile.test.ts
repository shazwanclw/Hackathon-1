import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDocs, mockGetDoc } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockGetDoc: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({})),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    getDocs: mockGetDocs,
    getDoc: mockGetDoc,
  };
});

import { getUserProfileSummary } from '@/lib/data';

describe('getUserProfileSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses auth email fallback when stored profile email is unknown reporter', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [], size: 0 })
      .mockResolvedValueOnce({ size: 0 })
      .mockResolvedValueOnce({ size: 0 });

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        email: 'Unknown reporter',
        username: 'shafwan',
        photoURL: '',
      }),
    });

    const summary = await getUserProfileSummary('user-1', 'user-1@gmail.com');

    expect(summary.email).toBe('user-1@gmail.com');
    expect(summary.username).toBe('shafwan');
  });
});
