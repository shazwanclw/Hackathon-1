# StrayLink MVP

StrayLink is a free-tier web MVP for reporting stray animals/urban wildlife and helping NGOs/councils manage response workflows.

## Stack
- Next.js 14 (App Router) + TypeScript + TailwindCSS
- Firebase Web SDK (Auth, Firestore, Storage)
- Firebase Cloud Functions + Gemini (server-side welfare risk screening)
- Leaflet + OpenStreetMap tiles

## Features
- Public homepage (`/`) with mission/goals and a single `Login / Join` CTA
- Unified auth (`/auth`): email/password login, registration, Google sign-in, or join as guest
- Public report flow: photo upload, auto-detect location (default) or manual map pin, optional caption
- Manual report map picker uses explicit Leaflet marker icons (prevents broken marker image in manual mode)
- Public map (`/map`) showing all submitted case markers from limited public snapshot data
- Public feed (`/feed`) showing all submitted reports, including reporter email and clickable reporter profile link
- User profile (`/profile` or `/profile?uid=<uid>`) showing reporter identity and all reports submitted by that user
- Gemini classifies animal type (`cat|dog|other`) and runs non-diagnostic welfare risk screening (`aiRisk`) server-side
- Firestore case lifecycle with event logs
- Role-based admin access from the same `/auth` flow via `admins` collection gating
- Admin dashboard, case detail actions, map view
- Public tracking via query route: `/track?caseId=<id>&t=<token>`
- Cohesive brown/honey visual theme with shared UI primitives and responsive layouts

## Project Structure
- `app/` routes (public + admin)
- `components/` shared UI blocks
- `lib/` firebase/auth/data/tf/types
- `styles/` global + leaflet CSS
- `firestore.rules`, `storage.rules`, `firebase.json`
- `prd.md`, `checklist.md`

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
- When adding new pages/components:
  - Prefer shared primitives before creating one-off classes
  - Reuse tokenized colors (`brand.*`, `honey.*`) instead of new hardcoded colors
  - Keep admin UI cleaner/simpler but palette-consistent with public pages

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create Firebase project (Spark/free plan is enough).
3. Enable Firebase Auth providers:
- Email/Password (for public `/auth`)
- Google (for `/auth`)
4. Create Firestore database (production/test mode as needed).
5. Enable Firebase Storage.
6. Copy `.env.example` to `.env.local` and fill values:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```
7. Deploy rules/indexes:
```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,storage
```
8. Install Functions dependencies and set Gemini secrets:
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
3. Sign in again via `/auth`; admin users are routed to `/admin/dashboard`, non-admin users to `/report`.

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

## Build and static export
```bash
npm run build
```
Static output is generated in `out/` (`next.config.js` sets `output: 'export'`).

## Firebase Hosting deploy
```bash
firebase deploy --only hosting
```
To deploy Gemini risk screening trigger:
```bash
firebase deploy --only functions
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
- Admins can override `aiRisk` urgency/type; overrides are logged in `case_events` as `ADMIN_OVERRIDE_AI_RISK`.

## Notes on free-tier constraints
- No Cloud Run required.
- No paid Google Maps API usage; map tiles from OpenStreetMap.
- Gemini classification and risk screening run in Firebase Functions and do not diagnose disease/infections.
- Public tracking is served from `public_tracks` docs keyed by `caseId + token` to avoid exposing full case listings.
- Public map is served from `public_map_cases` docs with limited fields (`status`, `animalType`, `urgency`, `lat/lng`).
