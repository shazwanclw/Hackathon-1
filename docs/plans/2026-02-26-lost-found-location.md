# Lost & Found Location Text Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add map-based location selection to Lost & Found post creation, reverse-geocode to a text label, and store only that label (no coordinates).

**Architecture:** Reuse the existing `MapPicker` + `reverseGeocode` flow from `/report`, but persist only `locationText` to `lost_found_posts`. Map pages remain unchanged. Introduce small, pure data helpers for payload building and doc mapping to keep Firestore calls thin and testable.

**Tech Stack:** Next.js (App Router), React, TypeScript, Firebase (Firestore/Storage), Leaflet, Vitest.

---

### Task 1: Add Lost & Found Data Helpers + Tests

**Files:**
- Create: `lib/data.lostfound.test.ts`
- Modify: `lib/data.ts`

**Step 1: Write the failing tests**

```ts
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
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- lib/data.lostfound.test.ts`
Expected: FAIL with `buildLostFoundPostPayload` or `mapLostFoundDocToPost` not found.

**Step 3: Implement minimal helpers in `lib/data.ts`**

```ts
export function buildLostFoundPostPayload(input: {
  createdBy: string;
  authorEmail: string;
  petName: string;
  description: string;
  contactInfo: string;
  locationText: string;
  photoUrls: string[];
  photoPaths: string[];
}) {
  const photoUrls = input.photoUrls.slice(0, 3);
  const photoPaths = input.photoPaths.slice(0, 3);
  return {
    createdBy: input.createdBy,
    authorEmail: input.authorEmail,
    petName: input.petName,
    description: input.description,
    contactInfo: input.contactInfo,
    locationText: input.locationText,
    photoUrl: photoUrls[0] ?? '',
    photoUrls,
    photoPaths,
    createdAt: serverTimestamp(),
  };
}

export function mapLostFoundDocToPost(id: string, data: Record<string, unknown>): LostFoundPost {
  const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
  const createdAt = typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
  const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';
  const photoUrls = Array.isArray(data.photoUrls) ? data.photoUrls.map((item) => String(item)).filter(Boolean).slice(0, 3) : [];
  const fallbackPhoto = String(data.photoUrl ?? '');
  const normalizedPhotoUrls = photoUrls.length ? photoUrls : fallbackPhoto ? [fallbackPhoto] : [];

  return {
    id,
    createdBy: String(data.createdBy ?? ''),
    authorEmail: String(data.authorEmail ?? 'Unknown'),
    petName: String(data.petName ?? ''),
    description: String(data.description ?? ''),
    contactInfo: String(data.contactInfo ?? ''),
    locationText: String(data.locationText ?? ''),
    photoUrl: normalizedPhotoUrls[0] ?? '',
    photoUrls: normalizedPhotoUrls,
    createdAtLabel,
  } as LostFoundPost;
}
```

Update `listLostFoundPosts` to use `mapLostFoundDocToPost`.

**Step 4: Run tests to verify they pass**

Run: `npm test -- lib/data.lostfound.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/data.ts lib/data.lostfound.test.ts
git commit -m "feat: add lost & found data helpers"
```

---

### Task 2: Add `locationText` to Lost & Found Types + Create API

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data.ts`

**Step 1: Update types**

```ts
export interface LostFoundPost {
  id: string;
  createdBy: string;
  authorEmail: string;
  petName: string;
  description: string;
  contactInfo: string;
  locationText: string;
  photoUrl: string;
  photoUrls: string[];
  createdAtLabel: string;
}
```

**Step 2: Update `createLostFoundPost` signature to accept `locationText` and use helper**

```ts
export async function createLostFoundPost(input: {
  id: string;
  createdBy: string;
  authorEmail: string;
  petName: string;
  description: string;
  contactInfo: string;
  locationText: string;
  photoUrls: string[];
  photoPaths: string[];
}) {
  await setDoc(doc(db, 'lost_found_posts', input.id), buildLostFoundPostPayload({
    createdBy: input.createdBy,
    authorEmail: input.authorEmail,
    petName: input.petName,
    description: input.description,
    contactInfo: input.contactInfo,
    locationText: input.locationText,
    photoUrls: input.photoUrls,
    photoPaths: input.photoPaths,
  }));
}
```

**Step 3: Run tests**

Run: `npm test -- lib/data.lostfound.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/types.ts lib/data.ts
git commit -m "feat: store lost & found location text"
```

---

### Task 3: Add Map-Based Location Picker to Lost & Found Create Page

**Files:**
- Modify: `app/lost-found/new/page.tsx`

**Step 1: Add location state and reverse geocoding (start with failing UI behavior)**

Add imports:
```ts
import dynamic from 'next/dynamic';
import { reverseGeocode } from '@/lib/geocoding';
```

Define map component:
```ts
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });
```

Add state near existing hooks:
```ts
const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
const [locationLabel, setLocationLabel] = useState('');
const [locationMessage, setLocationMessage] = useState('Pick a location on the map.');
```

Add effect for reverse geocoding:
```ts
useEffect(() => {
  let active = true;

  async function resolveLabel() {
    if (!location) {
      setLocationLabel('');
      return;
    }

    setLocationMessage('Looking up location name...');
    try {
      const result = await reverseGeocode(location);
      if (!active) return;
      const fallback = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
      setLocationLabel(result.label || fallback);
      setLocationMessage('');
    } catch {
      if (!active) return;
      setLocationLabel(`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`);
      setLocationMessage('');
    }
  }

  resolveLabel();
  return () => {
    active = false;
  };
}, [location]);
```

**Step 2: Update form validation to require location**

```ts
if (!location) {
  toast.error('Please pick a location on the map.');
  return;
}
```

**Step 3: Pass `locationText` to `createLostFoundPost` and reset state**

```ts
await createLostFoundPost({
  id: postId,
  createdBy: user.uid,
  authorEmail: user.email ?? '',
  petName: petName.trim(),
  description: description.trim(),
  contactInfo: contactInfo.trim(),
  locationText: locationLabel,
  photoUrls: uploadedPhotos.map((item) => item.downloadUrl),
  photoPaths: uploadedPhotos.map((item) => item.storagePath),
});

setLocation(null);
setLocationLabel('');
setLocationMessage('Pick a location on the map.');
```

**Step 4: Add UI section for map picker + label**

```tsx
<div className="space-y-2">
  <label className="label">Last seen location</label>
  {locationMessage ? <p className="text-xs text-muted">{locationMessage}</p> : null}
  {locationLabel ? <p className="text-xs text-muted">{locationLabel}</p> : null}
</div>
<div>
  <label className="label">Select location on map</label>
  <MapPicker value={location} onChange={setLocation} />
  <p className="mt-1 text-xs text-muted">Search or click map to place marker.</p>
</div>
```

**Step 5: Manual verification**

Run: `npm run dev`
Expected: Lost & Found create page shows a map picker, resolves text label, and submission includes location text.

**Step 6: Commit**

```bash
git add app/lost-found/new/page.tsx
git commit -m "feat: add location picker to lost & found create"
```

---

### Task 4: Display Location Text in Lost & Found List

**Files:**
- Modify: `app/lost-found/page.tsx`

**Step 1: Render location when available**

```tsx
{item.locationText ? (
  <p className="text-xs text-brand-800/80">Last seen: {item.locationText}</p>
) : null}
```

Place this near the description/contact block.

**Step 2: Manual verification**

Run: `npm run dev`
Expected: Existing posts still render; new posts show “Last seen: …” when present.

**Step 3: Commit**

```bash
git add app/lost-found/page.tsx
git commit -m "feat: show lost & found location text"
```

---

### Task 5: Verify Types and Lint

**Files:**
- None (validation step)

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Run test suite**

Run: `npm test`
Expected: PASS

**Step 3: Commit (if any fixes)**

```bash
git add -A
git commit -m "chore: fix lost & found location follow-ups"
```
