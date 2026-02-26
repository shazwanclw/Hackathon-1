# Adoption Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public adoption flow with shelter contact pages, role-gated adoption post creation, and admin shelter-role management using UID-based Firestore role documents.

**Architecture:** Add a new adoption domain (`adoption_posts` + `shelters`) integrated with existing Firebase client helpers and role checks. Public pages read adoption posts, while writes are gated by Firestore rules and client-side role checks. Admin manages shelter roles in a dedicated page under `/admin`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firebase Auth/Firestore/Storage, Tailwind CSS, Vitest + Testing Library.

---

### Task 1: Add failing tests for role helpers, nav link, and adoption list

**Files:**
- Create: `components/Navbar.test.tsx`
- Create: `app/adoption/page.test.tsx`
- Modify: `app/auth/page.test.tsx`

**Step 1: Write the failing tests**
- Add navbar test asserting `Adoption` link appears after `Feed` for signed-in/guest sessions.
- Add adoption page test asserting list render and `Contact Shelter` links.
- Extend auth routing test to ensure shelter users route to `/adoption` after auth (new behavior).

**Step 2: Run test to verify it fails**
Run: `npm run test -- components/Navbar.test.tsx app/adoption/page.test.tsx app/auth/page.test.tsx`
Expected: FAIL due to missing routes/links and role helper behavior.

**Step 3: Commit**
```bash
git add components/Navbar.test.tsx app/adoption/page.test.tsx app/auth/page.test.tsx
git commit -m "test: add failing adoption and role-routing tests"
```

### Task 2: Add domain types and data helpers for shelters and adoption posts

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data.ts`

**Step 1: Write the failing test**
- Add assertions in adoption page test that depend on typed adoption post structures and list/query helpers.

**Step 2: Run test to verify it fails**
Run: `npm run test -- app/adoption/page.test.tsx`
Expected: FAIL due to missing helper exports.

**Step 3: Write minimal implementation**
- Add `ShelterProfile`, `AdoptionPost`, `AdoptionStatus`, `PetType` types.
- Add helpers in `lib/data.ts`:
  - `createAdoptionPostId`
  - `uploadAdoptionImage`
  - `createAdoptionPost`
  - `listAdoptionPosts`
  - `getAdoptionPostById`
  - `upsertShelterProfile`
  - `listShelterProfiles`

**Step 4: Run test to verify it passes**
Run: `npm run test -- app/adoption/page.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/types.ts lib/data.ts
git commit -m "feat: add adoption and shelter data helpers"
```

### Task 3: Add shelter role checks and auth routing updates

**Files:**
- Modify: `lib/auth.ts`
- Modify: `app/auth/page.tsx`
- Modify: `app/auth/page.test.tsx`

**Step 1: Write the failing test**
- Add/adjust auth test to expect shelter users route to `/adoption` instead of `/report`.

**Step 2: Run test to verify it fails**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: FAIL expected route mismatch.

**Step 3: Write minimal implementation**
- Add `isUserShelter(uid)` helper in `lib/auth.ts` reading `shelters/{uid}` enabled.
- Update auth role routing order:
  - admin -> `/admin/dashboard`
  - shelter -> `/adoption`
  - other -> `/report`

**Step 4: Run test to verify it passes**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/auth.ts app/auth/page.tsx app/auth/page.test.tsx
git commit -m "feat: route shelter role and add shelter role helper"
```

### Task 4: Implement adoption pages and navbar integration

**Files:**
- Modify: `components/Navbar.tsx`
- Create: `app/adoption/page.tsx`
- Create: `app/adoption/[id]/page.tsx`
- Create: `app/adoption/contact/[id]/page.tsx`
- Create: `app/adoption/new/page.tsx`

**Step 1: Write the failing tests**
- Ensure navbar includes adoption link ordering.
- Ensure adoption page renders cards and role-gated create CTA.

**Step 2: Run tests to verify they fail**
Run: `npm run test -- components/Navbar.test.tsx app/adoption/page.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**
- Add nav link after `Feed`.
- Build `/adoption` list with loading/error/empty states.
- Add `/adoption/new` create form with admin/shelter role checks.
- Add detail/contact pages wired to `getAdoptionPostById`.

**Step 4: Run tests to verify they pass**
Run: `npm run test -- components/Navbar.test.tsx app/adoption/page.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add components/Navbar.tsx app/adoption
 git commit -m "feat: add adoption routes and navigation"
```

### Task 5: Add admin shelter-role management page

**Files:**
- Create: `app/admin/shelters/page.tsx`
- Modify: `components/Navbar.tsx`
- Modify: `components/AdminGuard.tsx` (if needed for messaging only)

**Step 1: Write failing test**
- Add focused rendering test for shelter admin page submission behavior.

**Step 2: Run test to verify it fails**
Run: `npm run test -- app/admin/shelters/page.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**
- Admin-only page to list shelter profiles and upsert role doc by UID.
- Add admin nav entry link path for shelters management.

**Step 4: Run test to verify it passes**
Run: `npm run test -- app/admin/shelters/page.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add app/admin/shelters/page.tsx components/Navbar.tsx app/admin/shelters/page.test.tsx
git commit -m "feat: add admin shelter role management"
```

### Task 6: Secure Firestore and update product docs

**Files:**
- Modify: `firestore.rules`
- Modify: `prd.md`
- Modify: `README.md`

**Step 1: Write failing test/check**
- Validate rule expectations manually against intended matrix.

**Step 2: Run check to verify current mismatch**
Run: `firebase emulators:exec --only firestore "npm run test -- app/adoption/page.test.tsx"` (optional if emulator unavailable, document limitation)
Expected: Fails or skipped before rules update.

**Step 3: Write minimal implementation**
- Add `isShelter()` function in rules.
- Add `shelters` + `adoption_posts` matches with role-gated writes.
- Document feature and role-assignment flow in PRD/README.

**Step 4: Run verification**
Run: `npm run test`
Run: `npm run lint`
Run: `npm run typecheck`
Expected: all pass

**Step 5: Commit**
```bash
git add firestore.rules prd.md README.md
git commit -m "feat: add adoption role model, rules, and docs"
```