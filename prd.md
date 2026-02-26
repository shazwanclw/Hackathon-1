# StrayLink PRD (MVP)

## 1) Product Overview
StrayLink is a web platform for reporting stray animals and urban wildlife, then routing those reports to NGOs or municipal teams for action. The MVP is built with Next.js, Firebase, Gemini-powered server-side AI, and Leaflet/OpenStreetMap, with no paid APIs and no Google Cloud billing requirements.

Implementation status update (February 20, 2026): Firebase Storage is now provisioned on project `kita-hack-hackathon`, and `storage.rules` has been successfully deployed.

## 2) Problem Statement
Communities often detect stray animals before authorities do. Reporting channels are fragmented and unstructured, leading to delayed response, poor case visibility, and weak accountability.

## 3) SDG Alignment
### SDG 11: Sustainable Cities and Communities
StrayLink contributes to safer, healthier neighborhoods by:
- improving response speed for dangerous or vulnerable-animal situations,
- improving sanitation and public-space quality through structured incident handling,
- creating traceable workflows between citizens and response teams.

## 4) Users and Roles
### Public Reporter (guest or optional account login)
- Continue as guest without account/session.
- Optionally register/login via email and password at `/auth`.
- Signed-in users can submit a case with photo, location, and incident details from `/report`.
- Receive case ID and tracking token.
- Track limited status via `/track?caseId=<caseId>&t=<token>`.
- View community feed at `/feed` with reporter identity and links to each reporter profile.
- View user profile at `/profile` (self) or `/profile?uid=<uid>` (public view) to see all reports by that user.

### Admin / NGO Operator (login required)
- Authenticate via Firebase Auth at `/auth` (Google sign-in or email/password).
- Access dashboard, case detail, and map.
- Verify AI tags, triage urgency, assign responders, resolve/reject cases.
- Manage shelter role assignments via UID at `/admin/shelters`.

### Shelter Operator (login required)
- Authenticate via Firebase Auth at `/auth`.
- Access `/adoption` and `/adoption/new` to publish adoptable pets.
- Maintain shelter contact details used by public adoption contact pages.

## 5) Goals and Non-Goals
### Goals (MVP)
- Public report flow with image upload (<=3MB), location mode (auto-detect default + manual map fallback), and metadata.
- Feed includes reporter email and profile link per report card.
- Profile view lists reports submitted by a given user.
- Lost & Found owner board for posting missing pet photos + contact info + last seen location.
- Lost & Found AI Match (Phase 1 prototype) to retrieve top likely stray matches from existing reports.
- Saved Match History for owners to revisit previous AI match runs.
- Adoption board where public users can browse adoptable pets and contact shelters.
- Server-side Gemini classification mapped to `cat|dog|other`.
- Server-side Gemini non-diagnostic welfare risk screening.
- Firestore case lifecycle: `new -> verified -> assigned -> resolved|rejected`.
- Admin dashboard with filtering and case actions.
- Leaflet map views for admin operations.
- Auditable event log in `case_events`.

### Non-Goals (MVP)
- No native mobile app.
- No real-time chat or push notifications.
- No paid geocoding APIs.
- No advanced role hierarchy beyond admin and shelter membership lists.

## 6) Functional Requirements
### Public
- Landing page `/` explains value and calls to action.
- Public auth page `/auth` provides login, register, and guest-entry actions.
- Report page `/report` supports photo upload, auto location (default) or manual map pin, and note.
- Manual map marker uses explicit Leaflet icon URLs to avoid broken default marker assets in Next.js.
- Public map page `/map` shows all submitted case markers using limited public snapshot fields.
- Feed page `/feed` shows all reports (not user-scoped), including reporter email + profile link.
- Profile page `/profile` shows user identity and user-scoped report history.
- Lost & Found posts page `/lost-found` lists owner posts and includes AI match trigger.
- Lost & Found create page `/lost-found/new` allows owners to post missing pet details with contact info and last seen location (map pin -> text).
- Lost & Found AI match page `/lost-found/ai-match` provides matching and saved match history.
- Adoption page `/adoption` lists pets available from shelters.
- Adoption detail `/adoption/[id]` shows pet profile and contact CTA.
- Adoption contact page `/adoption/contact/[id]` shows shelter contact details.
- Adoption create page `/adoption/new` allows post creation only for admin or shelter roles.
- Submission flow:
  1. Validate fields.
  2. Generate `caseId`.
  3. Upload image to Storage.
  4. Write `cases/{caseId}` with pending AI placeholders.
  6. Write `public_tracks/{caseId_token}` limited tracking snapshot.
  7. Write `case_events` (`submitted`).
  8. Return case ID + token immediately.
  9. Background Cloud Function calls Gemini and updates `ai`, `aiRisk`, `triage`, and public snapshots.
- Track page reads only the `public_tracks` snapshot, never full `cases` doc.

### Admin
- Unified login page `/auth` handles admin and public sign-in.
- Dashboard `/admin/dashboard` lists/filter cases.
- Case detail `/admin/case/[caseId]` supports verify/assign/resolve/reject with event log.
- Admin actions also sync `public_tracks` status snapshot.
- Map page `/admin/map` shows exact markers and filters.
- Shelter management page `/admin/shelters` allows admins to grant/revoke shelter role access by UID.

## 7) Data Model
### Firestore: `cases/{caseId}`
- `createdAt`: serverTimestamp
- `animalId`: string
- `createdBy`: authenticated reporter UID string
- `trackingToken`: string
- `photo`: `{ storagePath, downloadUrl }`
- `location`: `{ lat, lng, addressText, accuracy: "exact"|"approx" }`
- `report`: `{ count: "1"|"2-3"|"many", behavior: "calm"|"aggressive"|"unknown", immediateDanger: boolean, note: string }`
- `ai`: `{ model: string, animalType: "cat"|"dog"|"other", confidence: number, rawTopLabel: string }`
- `aiRisk`: `{ model: string, animalType: "cat"|"dog"|"other"|"unknown", visibleIndicators: string[], urgency: "low"|"medium"|"high", reason: string, confidence: number, disclaimer: string, needsHumanVerification: true, createdAt: timestamp, error: string|null, adminOverride: {...} }`
- `triage`: `{ urgency: "low"|"medium"|"high", reason: string, needsHumanVerification: true, source?: "ai"|"aiRisk"|"admin" }`
- `status`: `"new"|"verified"|"assigned"|"resolved"|"rejected"`
- `assignedTo`: string|null
- `resolution`: `{ outcome: "rescued"|"treated"|"relocated"|"false_report"|"unknown", notes: string, resolvedAt: timestamp } | null`

### Firestore: `public_tracks/{trackId}`
- `trackId`: `${caseId}_${trackingToken}`
- `caseId`: string
- `status`: string
- `ai`: `{ animalType, confidence }`
- `aiRisk`: `{ ...non-diagnostic risk output... }` (may arrive asynchronously)
- `triage`: `{ urgency }`
- `assignedTo`: string|null
- `resolution`: `{ outcome, notes } | null`
- `updatedAt`: serverTimestamp

### Firestore: `public_map_cases/{caseId}`
- `caseId`: string
- `status`: string
- `ai`: `{ animalType }`
- `triage`: `{ urgency }`
- `location`: `{ lat, lng }`
- `updatedAt`: serverTimestamp

### Firestore: `case_events/{eventId}`
- `caseId`, `timestamp`, `actorUid`, `action`, `changes`

### Firestore: `admins/{uid}`
- `enabled`: boolean
- `createdAt`: timestamp

### Firestore: `shelters/{uid}`
- `enabled`: boolean
- `shelterName`: string
- `contactEmail`: string
- `phone`: string
- `address`: string
- `createdAt`, `updatedAt`: timestamp

### Firestore: `animals/{animalId}` (public thread source for feed/profile)
- `createdBy`: reporter UID
- `createdByEmail`: reporter email (used by feed/profile)
- `type`, `coverPhotoUrl`, `lastSeenLocation`, `lastSeenAt`, `sightingCount`, `latestSightingCaption`, `latestSightingPhotoPath`

### Firestore: `animals/{animalId}/sightings/{sightingId}`
- `authorUid`: reporter UID
- `authorEmail`: reporter email
- `type`, `caption`, `photoUrl`, `photoPath`, `location`, `commentCount`, `createdAt`

### Firestore: `lost_found_posts/{postId}`
- `createdBy`: owner UID
- `authorEmail`: owner email
- `petName`: string
- `description`: string
- `contactInfo`: string
- `locationText`: string (derived from map pin; no lat/lng stored)
- `photoUrl`: string
- `photoUrls`: string[]
- `photoPaths`: string[]
- `createdAt`: serverTimestamp

### Firestore: `lost_found_match_history/{historyId}`
- `createdBy`: owner UID
- `animalType`: `"any"|"cat"|"dog"`
- `matches`: list of `{ animalId, score, reason, type, coverPhotoUrl, lastSeenLocation }`
- `createdAt`: serverTimestamp

### Firestore: `adoption_posts/{postId}`
- `createdBy`: poster UID
- `createdByEmail`: poster email
- `shelterUid`: shelter UID
- `shelterName`: string
- `petName`: string
- `petType`: `"cat"|"dog"|"other"`
- `ageText`: string
- `description`: string
- `photoUrl`: string
- `photoPath`: string
- `contactEmail`: string
- `phone`: string
- `address`: string
- `status`: `"available"|"adopted"`
- `createdAt`: serverTimestamp

## 8) Security and Privacy
- **Chosen approach: Option A-equivalent tokenized tracking snapshot.**
- Public cannot read/list `cases`.
- Public tracking reads are limited to `public_tracks/{caseId_token}` by possession of the secret tokenized document ID.
- Public map reads are served from `public_map_cases` limited snapshots (no direct public `cases` reads).
- Public can create `cases`, `public_tracks`, and `case_events` with restricted shape checks.
- Admin access requires `/admins/{uid}.enabled == true`.
- Shelter posting access requires `/shelters/{uid}.enabled == true`.
- Admins can read/list/update all `cases`, update `public_tracks`, and read/list `case_events`.
- Adoption posts are publicly readable; adoption post writes are restricted to admin/shelter roles.
- Storage enforces image content type and 3MB max upload.
- Lost & Found post creation requires authentication; Lost & Found posts are publicly readable.
- Minimal PII by design.

## 9) Architecture
- Frontend: Next.js 14 App Router, TypeScript, Tailwind.
- Data/Auth/Storage: Firebase Web SDK v9 modular.
- AI: Gemini via Firebase Cloud Functions for classification, non-diagnostic welfare risk screening, and Lost & Found Phase 1 visual match ranking.
- Maps: Leaflet + OpenStreetMap tiles.
- Deployment: Local development works with Next.js dev server. Public tracking uses a query route (`/track?caseId=...&t=...`) while admin case detail uses dynamic route segments (`/admin/case/[caseId]`).

## 10) Tech Constraints
- Node 18+
- No Cloud Run, no paid APIs, no Google Maps Platform.
- Use `NEXT_PUBLIC_*` env vars for Firebase client config.

## 11) UX Requirements
- Responsive hackathon-ready UI.
- Components: Navbar, CaseCard, StatusBadge, UploadDropzone, MapPicker, MapView, FiltersBar.
- Loading/error/empty states.
- Toasts for success and error feedback.

### Visual Design System (Current Baseline)
- Theme direction: warm brown + honey yellow palette with soft paper-like surfaces.
- Typography:
  - Display/headings: `Cormorant Garamond`.
  - Body/UI text: `Manrope`.
- Styling guardrails:
  - Use shared classes from `styles/globals.css` (`card`, `card-elevated`, `btn-primary`, `btn-secondary`, `btn-ghost`, `segment`, `segment-active`, `input`, `label`).
  - Prefer design tokens from `tailwind.config.js` (`brand.*`, `honey.*`) over ad-hoc hex colors.
  - Keep admin screens visually aligned but lower-ornament than public screens (function-first).
- Motion and interaction:
  - Subtle hover/focus transitions only; no distracting continuous animations.
  - Strong focus rings on all interactive controls for accessibility.
- Accessibility baseline:
  - Maintain WCAG-friendly contrast for text and controls.
  - Preserve semantic headings/labels and keyboard accessibility.

## 12) Key Metrics (MVP)
- Report submission success rate.
- Median report-to-verify time.
- Cases resolved ratio.
- High urgency share and response distribution.

## 13) Demo Flow
1. Public user submits case with photo/location.
2. Submission succeeds immediately; Gemini runs in background.
3. Case appears in admin dashboard as `new`.
4. Gemini updates animal type + welfare risk + triage.
5. Admin verifies, assigns, resolves.
6. Public tracking link shows status progression from `public_tracks`.
6. Admin map visualizes marker hotspots.

## 14) Risks and Mitigations
- Model variance -> expose confidence and require human verification.
- Abusive uploads -> 3MB + content-type rules + UI validation.
- Static export limitations -> client-only Firebase SDK patterns.

## 15) Future Upgrades
- Image compression pipeline and EXIF stripping.
- CSV exports and analytics dashboards.
- Notification channels (email/SMS/WhatsApp integration).
- Multi-org tenancy.
- Better geospatial aggregation and heatmaps.
- Design quality upgrades:
  - Introduce skeleton loaders for feed/map/profile to improve perceived performance.
  - Add a compact/dense mode for admin workflows handling large case volumes.
  - Add empty-state illustrations/icons per route for stronger visual hierarchy.
  - Add visual regression snapshots (Playwright) to prevent accidental style drift.
