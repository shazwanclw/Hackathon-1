# StrayLink PRD (MVP)

## 1) Product Overview
StrayLink is a web platform for reporting stray animals and urban wildlife, then routing those reports to NGOs or municipal teams for action. The MVP is built with Next.js, Firebase, TensorFlow.js, and Leaflet/OpenStreetMap, with no paid APIs and no Google Cloud billing requirements.

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
- Submit a case with photo, location, and incident details.
- Receive case ID and tracking token.
- Track limited status via `/track/[caseId]?t=<token>`.

### Admin / NGO Operator (login required)
- Authenticate via Firebase Auth (Google sign-in).
- Access dashboard, case detail, and map.
- Verify AI tags, triage urgency, assign responders, resolve/reject cases.

## 5) Goals and Non-Goals
### Goals (MVP)
- Public report flow with image upload (<=3MB), map location pick, and metadata.
- In-browser TFJS inference (MobileNet) mapped to `cat|dog|other`.
- Firestore case lifecycle: `new -> verified -> assigned -> resolved|rejected`.
- Admin dashboard with filtering and case actions.
- Leaflet map views for admin operations.
- Auditable event log in `case_events`.

### Non-Goals (MVP)
- No native mobile app.
- No real-time chat or push notifications.
- No paid geocoding APIs.
- No advanced role hierarchy beyond admin membership list.

## 6) Functional Requirements
### Public
- Landing page `/` explains value and calls to action.
- Public auth page `/auth` provides login, register, and guest-entry actions.
- Report page `/report` supports photo upload, map click, metadata, and note.
- Submission flow:
  1. Validate fields.
  2. Generate `caseId`.
  3. Upload image to Storage.
  4. Run TFJS classify.
  5. Write `cases/{caseId}`.
  6. Write `public_tracks/{caseId_token}` limited tracking snapshot.
  7. Write `case_events` (`created`, `ai_tagged`).
  8. Return case ID + token.
- Track page reads only the `public_tracks` snapshot, never full `cases` doc.

### Admin
- Login page `/admin/login` with Google sign-in.
- Dashboard `/admin/dashboard` lists/filter cases.
- Case detail `/admin/case/[caseId]` supports verify/assign/resolve/reject with event log.
- Admin actions also sync `public_tracks` status snapshot.
- Map page `/admin/map` shows exact markers and filters.

## 7) Data Model
### Firestore: `cases/{caseId}`
- `createdAt`: serverTimestamp
- `createdBy`: anonymous session id string
- `trackingToken`: string
- `photo`: `{ storagePath, downloadUrl }`
- `location`: `{ lat, lng, addressText, accuracy: "exact"|"approx" }`
- `report`: `{ count: "1"|"2-3"|"many", behavior: "calm"|"aggressive"|"unknown", immediateDanger: boolean, note: string }`
- `ai`: `{ model: "tfjs-mobilenet", animalType: "cat"|"dog"|"other", confidence: number, rawTopLabel: string }`
- `triage`: `{ urgency: "low"|"medium"|"high", reason: string, needsHumanVerification: true }`
- `status`: `"new"|"verified"|"assigned"|"resolved"|"rejected"`
- `assignedTo`: string|null
- `resolution`: `{ outcome: "rescued"|"treated"|"relocated"|"false_report"|"unknown", notes: string, resolvedAt: timestamp } | null`

### Firestore: `public_tracks/{trackId}`
- `trackId`: `${caseId}_${trackingToken}`
- `caseId`: string
- `status`: string
- `ai`: `{ animalType, confidence }`
- `triage`: `{ urgency }`
- `assignedTo`: string|null
- `resolution`: `{ outcome, notes } | null`
- `updatedAt`: serverTimestamp

### Firestore: `case_events/{eventId}`
- `caseId`, `timestamp`, `actorUid`, `action`, `changes`

### Firestore: `admins/{uid}`
- `enabled`: boolean
- `createdAt`: timestamp

## 8) Security and Privacy
- **Chosen approach: Option A-equivalent tokenized tracking snapshot.**
- Public cannot read/list `cases`.
- Public tracking reads are limited to `public_tracks/{caseId_token}` by possession of the secret tokenized document ID.
- Public can create `cases`, `public_tracks`, and `case_events` with restricted shape checks.
- Admin access requires `/admins/{uid}.enabled == true`.
- Admins can read/list/update all `cases`, update `public_tracks`, and read/list `case_events`.
- Storage enforces image content type and 3MB max upload.
- Minimal PII by design.

## 9) Architecture
- Frontend: Next.js 14 App Router, TypeScript, Tailwind.
- Data/Auth/Storage: Firebase Web SDK v9 modular.
- AI: TensorFlow.js MobileNet loaded client-side and cached.
- Maps: Leaflet + OpenStreetMap tiles.
- Deployment: Local development works with Next.js dev server. Current dynamic routes (`/track/[caseId]`, `/admin/case/[caseId]`) are not compatible with strict static export; for hosting, either refactor to static-safe routes or use a non-export Next hosting strategy.

## 10) Tech Constraints
- Node 18+
- No Cloud Run, no paid APIs, no Google Maps Platform.
- Use `NEXT_PUBLIC_*` env vars for Firebase client config.

## 11) UX Requirements
- Responsive hackathon-ready UI.
- Components: Navbar, CaseCard, StatusBadge, UploadDropzone, MapPicker, MapView, FiltersBar.
- Loading/error/empty states.
- Toasts for success and error feedback.

## 12) Key Metrics (MVP)
- Report submission success rate.
- Median report-to-verify time.
- Cases resolved ratio.
- High urgency share and response distribution.

## 13) Demo Flow
1. Public user submits case with photo/location.
2. AI predicts type in browser.
3. Case appears in admin dashboard as `new`.
4. Admin verifies, assigns, resolves.
5. Public tracking link shows status progression from `public_tracks`.
6. Admin map visualizes marker hotspots.

## 14) Risks and Mitigations
- TFJS model variance -> expose confidence and require human verification.
- Abusive uploads -> 3MB + content-type rules + UI validation.
- Static export limitations -> client-only Firebase SDK patterns.

## 15) Future Upgrades
- Image compression pipeline and EXIF stripping.
- CSV exports and analytics dashboards.
- Notification channels (email/SMS/WhatsApp integration).
- Multi-org tenancy.
- Better geospatial aggregation and heatmaps.
