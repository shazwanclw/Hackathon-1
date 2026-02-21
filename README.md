# StrayLink MVP

StrayLink is a free-tier web MVP for reporting stray animals/urban wildlife and helping NGOs/councils manage response workflows.

## Stack
- Next.js 14 (App Router) + TypeScript + TailwindCSS
- Firebase Web SDK (Auth, Firestore, Storage)
- TensorFlow.js + MobileNet (in-browser)
- Leaflet + OpenStreetMap tiles

## Features
- Public homepage (`/`) with mission/goals and a single `Login / Join` CTA
- Unified auth (`/auth`): email/password login, registration, Google sign-in, or join as guest
- Public report flow: photo upload, map click location, behavior + danger metadata
- Client-side AI auto-tag to `cat|dog|other`
- Firestore case lifecycle with event logs
- Role-based admin access from the same `/auth` flow via `admins` collection gating
- Admin dashboard, case detail actions, map view
- Public tracking via case ID + tracking token

## Project Structure
- `app/` routes (public + admin)
- `components/` shared UI blocks
- `lib/` firebase/auth/data/tf/types
- `styles/` global + leaflet CSS
- `firestore.rules`, `storage.rules`, `firebase.json`
- `prd.md`, `checklist.md`

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

## Build and static export
```bash
npm run build
```
Static output is generated in `out/` (`next.config.js` sets `output: 'export'`).

## Firebase Hosting deploy
```bash
firebase deploy --only hosting
```

## Notes on free-tier constraints
- No Cloud Run required.
- No paid Google Maps API usage; map tiles from OpenStreetMap.
- All AI inference runs in browser with TensorFlow.js.
- Public tracking is served from `public_tracks` docs keyed by `caseId + token` to avoid exposing full case listings.
