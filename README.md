# StrayLink MVP

StrayLink is a web MVP for reporting stray animals/urban wildlife and helping NGOs/councils manage response workflows.

## Problem Statement
Communities often notice stray animals before official responders do, but reporting is usually fragmented across chats, social posts, and informal channels. This causes delayed rescue, duplicate efforts, missing case history, and weak accountability for follow-up.

StrayLink addresses this by turning unstructured sightings into trackable, location-aware case reports with role-based workflows for citizens, shelters, and NGO/admin responders. The goal is to reduce response delays, improve coordination quality, and create a safer, more humane urban support system for both animals and communities.

> `MVP` means **Minimum Viable Product**: the smallest complete version that already delivers core value end-to-end.

## Why This Matters
### WHY?
**Stray-animal incidents are common, but coordinated response is not.**  
People care, yet many reports never become trackable action.

**When reporting stays fragmented, vulnerable animals remain invisible in systems that matter.**  
No reliable timeline means slower intervention and weaker accountability.

**StrayLink turns concern into action.**  
It provides one practical flow for communities to report, track, and support cases with clearer responsibility.

> These are not just numbers. They are living beings that deserve timely care and protection.

## Stack
- Next.js 14 (App Router) + TypeScript + TailwindCSS
- Firebase Web SDK (Auth, Firestore, Storage)
- Firebase Cloud Functions + Gemini (server-side classification, welfare risk screening, and Lost & Found AI matching)
- Leaflet + OpenStreetMap tiles

## Features
- Public homepage (`/`) with mission/goals and a single `Login / Join` CTA
- Unified auth (`/auth`): email/password login, registration, Google sign-in, or join as guest
- Public report flow: photo upload, auto-detect location (default) or manual map pin, optional caption
- Manual report map picker uses explicit Leaflet marker icons (prevents broken marker image in manual mode)
- Public map (`/map`) supports:
  - normal markers for latest sightings
  - hotspot heatmap mode for report density
- Public feed (`/feed`) showing submitted posts with social actions, reporter identity (username/avatar), and profile links
- Public adoption board:
  - browse adoptable pets at `/adoption`
  - open pet detail at `/adoption/[id]`
  - open shelter contact page at `/adoption/contact/[id]`
  - admin/shelter-only create page at `/adoption/new`
- User profile (`/profile` or `/profile?uid=<uid>`) showing reporter identity and all posts submitted by that user
- Lost & Found owner board:
  - browse posts at `/lost-found`
  - create post at `/lost-found/new` (photo + description + contact + last seen location via map pin)
  - floating create button in Lost & Found posts page
- Lost & Found AI Match (Phase 1 prototype):
  - open AI matcher at `/lost-found/ai-match`
  - upload one lost pet photo
  - returns top 3 likely matches from recent stray database entries
  - includes confidence, reason, and last seen coordinates when available
  - users can save match results to personal Match History for revisit
- Gemini classifies animal type (`cat|dog|other`) and runs non-diagnostic welfare risk screening (`aiRisk`) server-side
- Firestore case lifecycle with event logs
- Role-based admin access from the same `/auth` flow via `admins` collection gating
- Shelter role access via `shelters/{uid}` documents (`enabled: true`)
- Admin dashboard, case detail actions, map view
- Admin shelter-role management page at `/admin/shelters`
- Public tracking via query route: `/track?caseId=<id>&t=<token>`
- Cohesive brown/honey visual theme with shared UI primitives and responsive layouts
- Route-level pet-themed background image on Feed and Report pages (`/images/StrayLink.jpg`)

## Project Structure
- `app/` routes (public + admin)
- `components/` shared UI blocks
- `lib/` firebase/auth/data/tf/types
- `styles/` global + leaflet CSS
- `firestore.rules`, `storage.rules`, `firebase.json`
- `prd.md`, `checklist.md`

## Technical Architecture
- Frontend (Vercel): Next.js 14 App Router with TypeScript and TailwindCSS delivers public, admin, and shelter workflows in a single codebase.
- Authentication and authorization (Google Firebase Auth): unified `/auth` flow (email/password + Google sign-in), with role gating from Firestore collections (`admins/{uid}`, `shelters/{uid}`).
- Data layer (Google Cloud Firestore): operational records (`cases`, `case_events`) plus least-privilege public snapshots (`public_tracks`, `public_map_cases`) for token-based tracking and public map views.
- Media layer (Google Cloud Storage for Firebase): report images and Lost & Found/adoption images stored with 3MB/type constraints via `storage.rules`.
- AI services (Google Gemini API via Firebase Cloud Functions v2): server-side classification, non-diagnostic risk screening, caption draft generation, and Lost & Found visual matching.
- Maps and geospatial UX: Leaflet + OpenStreetMap for report pinning, public map markers, and hotspot heatmap visualization.

## Implementation Details
- Report ingestion is designed for low-latency UX: submit flow returns `caseId + trackingToken` immediately, while AI enrichment runs asynchronously in Cloud Functions and updates Firestore snapshots.
- Security model separates private operations from public access:
  - full case data remains in restricted `cases`
  - public tracking reads only `public_tracks/{caseId_token}`
  - public map uses `animals` for normal markers and `public_map_cases` for hotspot density
- AI outputs are intentionally constrained for safety and reliability:
  - structured JSON outputs validated server-side
  - strict non-diagnostic prompts and disclaimers
  - mandatory `needsHumanVerification` and admin override logging in `case_events`
- Lost & Found AI Match (Phase 1) innovation:
  - callable function compares one uploaded owner image against recent stray records
  - returns top matches with confidence and short reasoning
  - users can save match history for later follow-up
- Role-driven operations are implemented without separate apps:
  - public, admin, and shelter users share one authentication entrypoint
  - post-login routing and page permissions are controlled by Firestore role docs

## Challenges Faced
- Firebase onboarding and setup learning curve (student perspective):
  - challenge: initially unfamiliar with setting up Firebase services end-to-end (Auth, Firestore, Storage, Functions) and connecting all configs correctly
  - approach: iterative setup with `.env` validation, Firebase CLI workflow, and staged testing of each service before integration
- Security rules debugging in real scenarios:
  - challenge: early rules were either too strict (blocking valid flows) or too open (risking oversharing)
  - approach: tightened Firestore/Storage rules collection-by-collection and moved public reads to restricted snapshot docs
- Balancing public transparency with privacy/security:
  - challenge: users need trackability without exposing full case datasets
  - approach: tokenized snapshot documents and strict Firestore rules
- Keeping response fast while using AI:
  - challenge: synchronous AI calls would slow report submission
  - approach: asynchronous Cloud Function pipeline with immediate acknowledgment
- Ensuring trustworthy AI behavior for welfare workflows:
  - challenge: avoiding diagnostic or unsafe model outputs
  - approach: constrained prompts, JSON schema checks, confidence capture, and required human verification
- Prompt engineering and output consistency:
  - challenge: AI responses were initially inconsistent in format/wording for downstream UI usage
  - approach: strict JSON-only prompting, schema validation, and fallback error handling for stable outputs
- Working within a limited hackathon trial window:
  - challenge: we built and validated the backend during a 3-month Firebase trial while keeping scope realistic
  - approach: prioritized core flows first, used OpenStreetMap for mapping, and avoided unnecessary infrastructure complexity
- Deployment and environment split (local, Vercel, Firebase):
  - challenge: managing separate concerns for web deploy (Vercel) and backend deploy (Firebase functions/rules) without misconfiguration
  - approach: explicit deployment sections and environment separation in project docs/config
- Cross-platform map rendering quirks in Next.js:
  - challenge: default Leaflet marker asset paths break in some builds
  - approach: explicit marker icon configuration in manual map picker

## Future Roadmap
- Increase user engagement with community gamification:
  - weekly mission system (for example: submit 3 verified stray reports, complete 3 feeding/help actions, or contribute 3 meaningful updates/comments)
  - points and streaks for consistent participation, with anti-spam validation rules
  - public trust/reputation score on profiles (helpful contributor badges, responder reliability indicators) to make active accounts more approachable and credible
  - seasonal/local challenge campaigns to motivate neighborhood-level participation
- Improve AI quality and confidence workflows:
  - stronger match ranking, better explainability, optional reviewer feedback loop
- Strengthen operational tooling:
  - richer admin analytics, exports, and SLA-style response monitoring
- Expand user communication:
  - optional email/SMS/WhatsApp notifications for major case status changes
- Improve media and performance:
  - image compression pipeline, EXIF stripping, and skeleton loading states
- Scale organization support:
  - multi-organization tenancy, finer-grained roles, and audit/reporting upgrades
- Production hardening:
  - visual regression coverage, denser admin workflows for high volume, and reliability instrumentation

## UI Theme and Style Guide
- Core palette is defined in `tailwind.config.js`:
  - `brand.*` for brown tones
  - `honey.*` for yellow accents
- Global UI primitives are defined in `styles/globals.css`:
  - Layout/text: `container-shell`, `page-title`, `page-subtitle`, `text-muted`
  - Surfaces: `card`, `card-elevated`
  - Controls: `btn-primary`, `btn-secondary`, `btn-ghost`, `segment`, `segment-active`, `input`, `label`
- Typography:
  - Display: `Cormorant Garamond`
  - Body: `Manrope`
  - Brand logo wordmark: `Lobster Two`
- When adding new pages/components:
  - Prefer shared primitives before creating one-off classes
  - Reuse tokenized colors (`brand.*`, `honey.*`) instead of new hardcoded colors
  - Keep admin UI cleaner/simpler but palette-consistent with public pages

## Setup
1. Confirm Node.js version:
```bash
node -v
```
Use Node `20.x` to match Firebase Functions runtime.
2. Install dependencies:
```bash
npm install
```
3. Create Firebase project (configured under your active billing/trial account).
4. Enable Firebase Auth providers:
- Email/Password (for public `/auth`)
- Google (for `/auth`)
5. Create Firestore database (production/test mode as needed).
6. Enable Firebase Storage.
7. Copy `.env.example` to `.env.local` and fill values:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```
Optional override for Cloud Functions model selection:
```bash
GEMINI_MODEL=gemini-2.5-flash
```
`GEMINI_API_KEY` should be configured as a Firebase Functions secret (next step), not exposed in browser code.
8. Deploy Firebase security rules:
```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,storage
```
9. Install Functions dependencies and set Gemini secrets:
```bash
cd functions
npm install
firebase functions:secrets:set GEMINI_API_KEY
cd ..
```

## Admin Bootstrap
1. Run app and sign in once via `/auth` (Google or email/password) to get your UID.
2. In Firestore, create doc:
- Collection: `admins`
- Doc ID: `<your-uid>`
- Fields:
  - `enabled: true`
  - `createdAt: <timestamp>`
3. Sign in again via `/auth`; admin users are routed to `/admin/dashboard`, shelter users to `/adoption`, and others to `/report`.
4. To grant shelter role access, go to `/admin/shelters` as an admin and add the target user's UID with shelter contact profile.

## Run locally
```bash
npm run dev
```
Open `http://localhost:3000`.

## Test and quality checks
```bash
npm run test
npm run lint
npm run typecheck
```

For visual consistency after UI changes, always run all three checks before commit.

## Build
```bash
npm run build
```

## Optional static export (only if you still need Firebase Hosting for web)
If you deploy the web app on Vercel, you can skip this section. Static export is opt-in via `NEXT_OUTPUT_EXPORT=1`.

PowerShell:
```powershell
$env:NEXT_OUTPUT_EXPORT="1"
npm run build
```

Bash:
```bash
NEXT_OUTPUT_EXPORT=1 npm run build
```

When enabled, static output is generated in `out/`.

## Web deploy (Vercel)
```bash
vercel
```
Production deploy:
```bash
vercel --prod
```

## Firebase backend deploy
Deploy rules and Cloud Functions (Gemini triggers/callables):
```bash
firebase deploy --only firestore:rules,storage,functions
```

## One-time backfill for reporter emails
If you added reporter profile links after reports already existed, older `animals/{animalId}` docs may be missing `createdByEmail`.

Run from the `functions/` folder:
```bash
npm run backfill:reporter-emails
```
This is a dry-run and prints what would change.

Apply writes:
```bash
npm run backfill:reporter-emails -- --write
```
The script resolves each missing email from Firebase Auth using `createdBy` (UID) and updates `animals/{animalId}.createdByEmail`.

If you see credential/project errors, run with explicit options:
```bash
npm run backfill:reporter-emails -- --project kita-hack-hackathon --credentials C:\\path\\to\\service-account.json --write
```
Or configure ADC once:
```bash
gcloud auth application-default login
```

## Gemini non-diagnostic AI flow
- Report submit is immediate; AI processing continues asynchronously in Cloud Functions.
- Animal type and risk screening are both produced by Gemini.
- `cases/{caseId}.ai` is updated by Gemini and mirrored to `public_tracks` / `public_map_cases`.
- A Firestore-triggered Cloud Function enriches new cases with `cases/{caseId}.aiRisk` using Gemini vision.
- Gemini is used only server-side (no API key in browser).
- Output is strictly non-diagnostic triage guidance:
  - observable indicators only
  - urgency suggestion (`high|medium|low`)
  - always `needsHumanVerification=true`
  - disclaimer: `Not a medical diagnosis. For triage only. Requires human verification.`
- Public UI surfaces present AI details in a cleaner, readability-first format (for example `AI Accuracy Level` and `Visible indicators` cards) while backend safety fields remain preserved in data.
- Admins can override `aiRisk` urgency/type; overrides are logged in `case_events` as `ADMIN_OVERRIDE_AI_RISK`.

## Lost & Found AI Match (Phase 1)
- Callable function: `findLostPetMatches` (authenticated users only).
- Input: one lost-pet image + optional type filter (`any|cat|dog`).
- Matching scope: recent stray animal records with available cover photos.
- Output: top 3 potential matches (`animalId`, score, reason, last seen coordinates if present).
- Saved history: authenticated users can persist match results in `lost_found_match_history`.
- Prototype constraints:
  - heuristic visual matching quality depends on image clarity and angle
  - not guaranteed identity verification
  - recommended human confirmation before contacting owner/reporting outcome

## Hackathon Rubric Mapping (Quick Reference)
This section is intentionally separated for judge-friendly review.

### Category A: Impact (60%)
**Problem Statement & SDG Alignment**
- Current answer: The project targets fragmented stray-animal reporting and delayed response workflows, aligned to SDG 11 (Sustainable Cities and Communities).
- Why this is justified: Safer public spaces, faster incident response, and clearer coordination between residents, NGOs, and municipal responders.
- Technology contribution: Gemini-based triage support, structured tracking snapshots, and map workflows are used to improve response speed and consistency.

**Success Metrics & Scalability**
- Current measurable goals:
  - report submission success rate
  - median report-to-verify time
  - resolved-case ratio
  - urgency distribution
- Scalability direction already defined:
  - multi-organization support
  - analytics/exports
  - notification channels
  - reliability and admin workflow hardening

**AI Integration (Google AI Technology)**
- Google AI used: Gemini (via Firebase Cloud Functions).
- Where AI is meaningful:
  - non-diagnostic welfare risk screening with structured output
  - animal type classification for triage/map context
  - Lost & Found image matching (top-candidate retrieval)
  - optional caption draft generation for faster posting
- Why Gemini: server-side integration allows controlled prompts, schema validation, and safer moderation of model output before showing results to users.

**Technology Innovation**
- Innovation highlights:
  - tokenized public tracking model (`public_tracks`) that preserves visibility without exposing private case docs
  - dual-map strategy (normal sightings + hotspot density) for operational awareness
  - role-aware single app flow (public/admin/shelter) without separate codebases
  - engagement roadmap (weekly missions, points, trust badges) to increase sustained community participation

### Category B: Technology (20%)
**Technical Architecture & Google Technologies**
- Architecture summary: Next.js frontend on Vercel + Firebase Auth/Firestore/Storage + Cloud Functions + Gemini + Leaflet/OpenStreetMap.
- Google stack rationale: Firebase provides rapid full-stack integration (identity, database, storage, serverless) and Gemini adds AI capabilities needed for triage and matching.

**Technical Implementation & Challenges**
- Implemented components:
  - role-based auth and route gating
  - report ingestion with image upload + tracking token
  - admin case actions and audit events
  - Lost & Found posting and AI match history
  - public map + hotspot mode
- Major challenge examples addressed:
  - Firebase setup and cross-service configuration learning curve
  - Firestore/Storage rules balancing security vs usability
  - AI output consistency and safety controls
  - deployment split between Vercel (web) and Firebase (backend)

**Completeness & Demonstration**
- Prototype status: Functional end-to-end prototype is implemented and demoable (public reporting, tracking, admin operations, AI-assisted workflows).
- Demonstration readiness:
  - documented setup, run, deploy, and admin bootstrap steps
  - reproducible local run (`npm run dev`) and test/lint/typecheck commands
  - clear demo flow in `prd.md`
