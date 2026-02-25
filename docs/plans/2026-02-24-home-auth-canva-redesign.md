# Home/Auth Canva Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign homepage and auth page to match Canva references while preserving all existing functional behavior and routes.

**Architecture:** Keep application logic unchanged and implement visual changes via shared CSS utilities and structural JSX updates in `Navbar`, home, and auth pages. Preserve route handlers and auth side effects; add focused tests for new UI landmarks and keep existing behavior assertions.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, TailwindCSS, Vitest + Testing Library

---

### Task 1: Add failing tests for new visual landmarks

**Files:**
- Modify: `app/page.test.tsx`
- Modify: `app/auth/page.test.tsx`

**Step 1: Write the failing test**

Add assertions for:
- home hero shell landmark (`data-testid="home-hero"`)
- auth hero shell landmark (`data-testid="auth-hero"`)

**Step 2: Run test to verify it fails**

Run: `npm run test -- app/page.test.tsx app/auth/page.test.tsx`  
Expected: FAIL because landmarks do not exist yet.

**Step 3: Write minimal implementation**

Add those landmarks in corresponding pages without changing behavior.

**Step 4: Run test to verify it passes**

Run: `npm run test -- app/page.test.tsx app/auth/page.test.tsx`  
Expected: PASS.

### Task 2: Implement shared Canva-style tokens and classes

**Files:**
- Modify: `styles/globals.css`

**Step 1: Write the failing test**

No CSS unit test; rely on existing page tests and lint/typecheck.

**Step 2: Run test to verify it fails**

N/A for CSS-only changes.

**Step 3: Write minimal implementation**

Add classes for:
- script logo typography
- hero image frame/overlay blocks
- pill nav controls and glass panel utilities

**Step 4: Run test to verify it passes**

Run: `npm run test -- app/page.test.tsx app/auth/page.test.tsx`  
Expected: PASS.

### Task 3: Redesign navbar to Canva-style pills

**Files:**
- Modify: `components/Navbar.tsx`

**Step 1: Write the failing test**

No navbar test file exists currently.

**Step 2: Run test to verify it fails**

N/A.

**Step 3: Write minimal implementation**

Update classes and logo font usage while preserving link composition logic and logout/guest behavior.

**Step 4: Run test to verify it passes**

Run: `npm run test -- app/page.test.tsx app/auth/page.test.tsx`  
Expected: PASS.

### Task 4: Redesign home page hero composition

**Files:**
- Modify: `app/page.tsx`

**Step 1: Write the failing test**

Covered in Task 1 (`home-hero`).

**Step 2: Run test to verify it fails**

Already verified in Task 1.

**Step 3: Write minimal implementation**

Build hero panel with:
- image background (`/images/hero-cat.png`)
- right overlay text block
- login/join CTA placement
- keep login/join visibility logic based on auth/guest state

**Step 4: Run test to verify it passes**

Run: `npm run test -- app/page.test.tsx app/auth/page.test.tsx`  
Expected: PASS.

### Task 5: Redesign auth page to match Canva login panel

**Files:**
- Modify: `app/auth/page.tsx`

**Step 1: Write the failing test**

Covered in Task 1 (`auth-hero`).

**Step 2: Run test to verify it fails**

Already verified in Task 1.

**Step 3: Write minimal implementation**

Implement right-side rounded auth panel over hero image background, preserving all auth handlers and labels.

**Step 4: Run test to verify it passes**

Run: `npm run test -- app/page.test.tsx app/auth/page.test.tsx`  
Expected: PASS.

### Task 6: Full verification

**Files:**
- Modify: none

**Step 1: Run tests**

Run: `npm run test`  
Expected: all tests pass.

**Step 2: Run lint**

Run: `npm run lint`  
Expected: 0 errors.

**Step 3: Run typecheck**

Run: `npm run typecheck`  
Expected: 0 TypeScript errors.

