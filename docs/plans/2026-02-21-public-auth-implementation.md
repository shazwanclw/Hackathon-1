# Public Auth Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public authentication flow with email/password login, email/password registration, and guest entry, while preserving the existing admin login flow.

**Architecture:** Keep `/` as a mission-focused landing page and introduce a dedicated `/auth` client route for public auth actions. Extend `lib/auth.ts` with email/password helpers and keep guest as pure navigation (no Firebase anonymous session). Add a lightweight frontend test setup and implement via strict TDD.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firebase Web SDK v9, Vitest, React Testing Library

---

### Task 1: Add test infrastructure for React component TDD

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `tsconfig.vitest.json`

**Step 1: Write the failing test command contract**
Define a first placeholder test run target by creating the test script before tests exist.

**Step 2: Run test to verify it fails**
Run: `npm run test`
Expected: FAIL because test runner/config not fully wired.

**Step 3: Write minimal implementation**
- Add dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Add scripts: `test`, `test:watch`.
- Create minimal Vitest config + setup file with jest-dom matchers.

**Step 4: Run test to verify it passes baseline**
Run: `npm run test`
Expected: PASS with zero tests found (or no failures).

**Step 5: Commit**
```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts tsconfig.vitest.json
git commit -m "test: add vitest setup for frontend tdd"
```

### Task 2: Add failing tests for public auth page behavior

**Files:**
- Create: `app/auth/page.test.tsx`
- Test: `app/auth/page.test.tsx`

**Step 1: Write the failing test**
Add tests covering:
- renders login mode by default
- switches to register mode
- guest button routes to `/report`
- login submits email/password handler
- register submits email/password handler

**Step 2: Run test to verify it fails**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: FAIL because `app/auth/page.tsx` and supporting handlers do not exist.

**Step 3: Write minimal implementation (test scaffolding only)**
Mock `next/navigation` router and `@/lib/auth` functions in test file.

**Step 4: Run test to verify it still fails correctly**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: FAIL with missing component/functionality assertions (not import/setup errors).

**Step 5: Commit**
```bash
git add app/auth/page.test.tsx
git commit -m "test: add failing coverage for public auth page"
```

### Task 3: Implement email/password auth helpers in shared auth lib

**Files:**
- Modify: `lib/auth.ts`
- Test: `app/auth/page.test.tsx`

**Step 1: Write the failing test**
Use existing auth page tests expecting calls to `loginWithEmail` and `registerWithEmail` exports.

**Step 2: Run test to verify it fails**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: FAIL with missing exports from `lib/auth.ts`.

**Step 3: Write minimal implementation**
Add:
- `loginWithEmail(email: string, password: string)` via `signInWithEmailAndPassword`
- `registerWithEmail(email: string, password: string)` via `createUserWithEmailAndPassword`

**Step 4: Run test to verify progress**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: FAIL now only on missing `/auth` UI behavior.

**Step 5: Commit**
```bash
git add lib/auth.ts
git commit -m "feat: add email-password auth helpers"
```

### Task 4: Implement `/auth` page to satisfy tests

**Files:**
- Create: `app/auth/page.tsx`
- Test: `app/auth/page.test.tsx`

**Step 1: Write the failing test**
Ensure tests assert:
- mode toggle text
- submit labels per mode
- router push on success and guest flow
- loading state and error message behavior

**Step 2: Run test to verify it fails**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: FAIL because page does not yet implement expected behavior.

**Step 3: Write minimal implementation**
- Build client component with `Login`/`Register` mode state.
- Form fields: email, password.
- Call `loginWithEmail` or `registerWithEmail` on submit.
- `Join as Guest` button routes to `/report`.
- Show user-friendly error text from Firebase error codes.

**Step 4: Run test to verify it passes**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/auth/page.tsx app/auth/page.test.tsx
git commit -m "feat: add public auth page with login register guest"
```

### Task 5: Update landing page CTAs and navigation to expose new flow

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/Navbar.tsx`
- Test: `app/auth/page.test.tsx`

**Step 1: Write the failing test**
Add or adjust assertions for discoverability text (button labels/links) if needed.

**Step 2: Run test to verify it fails**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: FAIL on expected CTA labels/links.

**Step 3: Write minimal implementation**
- Add homepage CTA `Login / Join` -> `/auth`.
- Keep admin login CTA clear and separate.
- Add navbar entry to `/auth` for public users.

**Step 4: Run test to verify it passes**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/page.tsx components/Navbar.tsx app/auth/page.test.tsx
git commit -m "feat: expose public auth flow from home and nav"
```

### Task 6: Update product docs and checklist

**Files:**
- Modify: `prd.md`
- Modify: `checklist.md`

**Step 1: Write failing documentation expectation**
Define required doc deltas:
- public role can optionally login/register or continue as guest
- functional requirements include `/auth`
- checklist captures implemented public auth feature

**Step 2: Verify current docs do not include all items**
Run: `rg -n "(/auth|Register|guest|email/password)" prd.md checklist.md`
Expected: missing coverage for at least one required item.

**Step 3: Write minimal implementation**
Update `prd.md` and `checklist.md` to match implemented behavior.

**Step 4: Verify docs include required language**
Run: `rg -n "(/auth|Register|guest|email/password)" prd.md checklist.md`
Expected: all required references present.

**Step 5: Commit**
```bash
git add prd.md checklist.md
git commit -m "docs: update prd and checklist for public auth"
```

### Task 7: Final verification

**Files:**
- Modify: none (unless fixes required)

**Step 1: Run focused tests**
Run: `npm run test -- app/auth/page.test.tsx`
Expected: PASS.

**Step 2: Run project checks**
Run: `npm run lint`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS.

**Step 3: Run build check**
Run: `npm run build`
Expected: may fail only on known static export/dynamic route constraint already documented; no new auth-related failures.

**Step 4: If needed, write minimal fixes and re-run checks**
Apply only fixes needed to keep new feature correct and typed.

**Step 5: Commit final fixes (if any)**
```bash
git add -A
git commit -m "chore: finalize public auth verification fixes"
```
