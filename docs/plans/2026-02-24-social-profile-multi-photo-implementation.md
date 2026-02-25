# Social Profile + Multi-Photo Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement up to 3 photos per report plus public social profile fields and follow/unfollow while preserving existing functionality.

**Architecture:** Extend existing Firestore-backed data layer in `lib/data.ts` and `lib/types.ts` with backward-compatible optional fields. Keep current case/report submission flow and add multi-upload support by preserving the existing first-photo fields and introducing arrays for newer UI surfaces. Update feed and profile UI to consume enriched user profile metadata from a new `users` collection and follow edges from `follows`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firebase Auth/Firestore/Storage, TailwindCSS, Vitest + Testing Library

---

### Task 1: Add failing tests for multi-photo and social profile behavior

**Files:**
- Create: `components/UploadDropzone.test.tsx`
- Modify: `app/feed/page.test.tsx`
- Modify: `app/profile/page.test.tsx`
- Modify: `lib/data.animals.test.ts`

**Step 1: Write the failing test**

- Add test asserting upload component forwards up to 3 selected files.
- Add feed test asserting username/avatar header and three rendered images.
- Add profile test asserting follower/following labels and follow/edit control rendering.
- Add payload builder test asserting `latestSightingPhotoUrls` and `photoUrls`.

**Step 2: Run test to verify it fails**

Run: `npm run test -- components/UploadDropzone.test.tsx app/feed/page.test.tsx app/profile/page.test.tsx lib/data.animals.test.ts`  
Expected: FAIL because behavior is not implemented.

**Step 3: Write minimal implementation**

Implement only what failing tests require in subsequent tasks.

**Step 4: Run test to verify it passes**

Run same command and expect PASS after Tasks 2-5.

### Task 2: Extend shared types and data-layer mapping

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data.ts`

**Step 1: Write the failing test**

Covered by Task 1 tests.

**Step 2: Run test to verify it fails**

Covered by Task 1.

**Step 3: Write minimal implementation**

- Add `photoUrls` fields to sighting/feed-facing types.
- Add profile user types with username/photo and follow counts.
- Update animal/sighting payload builders to persist first-photo compatibility and new arrays.
- Add profile/follow helpers:
  - get/upsert user profile
  - follow/unfollow
  - is-following check
  - follower/following count queries

**Step 4: Run test to verify it passes**

Run targeted test command and expect fewer/fixed failures.

### Task 3: Implement multi-image report upload flow (max 3)

**Files:**
- Modify: `components/UploadDropzone.tsx`
- Modify: `app/report/page.tsx`

**Step 1: Write the failing test**

Covered by Task 1 upload test.

**Step 2: Run test to verify it fails**

Covered by Task 1.

**Step 3: Write minimal implementation**

- Allow selecting multiple files (limit 3).
- Validate each selected file size (3MB).
- Upload all files during report submit.
- Persist arrays while preserving legacy single-photo fields.

**Step 4: Run test to verify it passes**

Run targeted test command.

### Task 4: Implement feed card social header and 1-3 image grid

**Files:**
- Modify: `app/feed/page.tsx`

**Step 1: Write the failing test**

Covered by Task 1 feed test.

**Step 2: Run test to verify it fails**

Covered by Task 1.

**Step 3: Write minimal implementation**

- Render avatar + username + reporter link.
- Render up to 3 images in responsive grid.
- Keep existing caption, AI risk labels, and links.

**Step 4: Run test to verify it passes**

Run targeted test command.

### Task 5: Revamp profile page with public social data and edit/follow controls

**Files:**
- Modify: `app/profile/page.tsx`

**Step 1: Write the failing test**

Covered by Task 1 profile tests.

**Step 2: Run test to verify it fails**

Covered by Task 1.

**Step 3: Write minimal implementation**

- Show avatar, username, email, follower/following counts.
- Own profile: edit username + avatar upload and save.
- Other profiles: follow/unfollow button.
- Preserve existing report listing.

**Step 4: Run test to verify it passes**

Run targeted test command.

### Task 6: Security rules for new collections

**Files:**
- Modify: `firestore.rules`

**Step 1: Write the failing test**

No rules unit tests in repo; validate with lint/typecheck/tests + rules review.

**Step 2: Run test to verify it fails**

N/A.

**Step 3: Write minimal implementation**

Add public read + owner-scoped write rules for `users` and `follows`.

**Step 4: Run test to verify it passes**

Run full repo verification.

### Task 7: Full verification

**Files:**
- Modify: none

**Step 1: Run tests**

Run: `npm run test`  
Expected: all tests pass.

**Step 2: Run lint**

Run: `npm run lint`  
Expected: no warnings/errors.

**Step 3: Run typecheck**

Run: `npm run typecheck`  
Expected: no TypeScript errors.

