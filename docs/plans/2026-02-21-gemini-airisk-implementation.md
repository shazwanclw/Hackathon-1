# Gemini AI Risk Screening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add non-diagnostic Gemini welfare risk screening on case photos while preserving existing TFJS MobileNet tagging.

**Architecture:** Keep TFJS classification in-browser during report submit and persist to `cases/{caseId}.ai`. Add a Firebase Cloud Function trigger that enriches new cases with `aiRisk` from Gemini using Storage bytes by `photo.storagePath`. Expose `aiRisk` in tracking/admin UIs and support admin overrides with audit events.

**Tech Stack:** Next.js App Router, Firebase Firestore/Storage, Firebase Functions v2, Gemini (`@google/genai`), Vitest.

---

### Task 1: Add failing tests for new AI risk parser + case payload helpers
- Create tests for strict JSON validation/normalization and case payload defaults.
- Verify tests fail before implementation.

### Task 2: Implement schema/types and data-layer builders
- Extend `lib/types.ts` with `AiRisk` + override schema.
- Add case payload builder in `lib/data.ts` and keep existing animal payload logic.

### Task 3: Restore `/report` case flow while preserving animals flow
- On submit: upload case image, run TFJS locally, create `cases`, `public_tracks`, `public_map_cases`, and keep `animals` write.
- Trigger case-event creation for initial submit.

### Task 4: Add Firebase Functions Gemini enrichment
- Create `functions/` project with Firestore trigger on `cases/{caseId}`.
- Fetch image bytes from Storage by `storagePath`.
- Call Gemini with strict prompt and parse strict JSON.
- Write `aiRisk`, mirror `triage`, and add `AI_RISK_SCREENED` event.
- Add idempotency and processing guard.

### Task 5: Add admin override + track page display
- Track page: show `aiRisk` panel with loading/empty state + disclaimer.
- Admin case page: show `aiRisk`, allow admin urgency/animal override, write `aiRisk.adminOverride`, update `triage.urgency`, log `ADMIN_OVERRIDE_AI_RISK`.

### Task 6: Docs/config updates and verification
- Update `firebase.json` for functions.
- Update `.env.example` + `README.md` with Gemini env/deploy instructions and non-diagnostic disclaimer.
- Run targeted tests, then project test/typecheck if feasible.
