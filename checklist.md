# StrayLink MVP Checklist

## 0) Foundation Docs
- [x] Create `prd.md` with complete MVP requirements and architecture.
- [x] Create `checklist.md` and keep it current during implementation.

## 1) Project Bootstrap
- [x] Initialize Next.js 14+ App Router + TypeScript project structure.
- [x] Configure TailwindCSS and global styles.
- [x] Add dependencies in `package.json` (firebase, tfjs, mobilenet, leaflet, react-leaflet, toast lib).
- [x] Add base lint/type scripts and static export config.

## 2) Core Project Structure
- [x] Create `/app` routes and shared layouts.
- [x] Create `/components` reusable UI blocks.
- [x] Create `/lib` helpers (`firebase.ts`, `tf.ts`, `types.ts`, `auth.ts`, utilities).
- [x] Add `/styles` map and utility CSS.

## 3) Firebase Setup
- [x] Implement Firebase initialization module.
- [x] Implement Auth helpers for admin login/logout and admin status check.
- [x] Implement Firestore helpers for CRUD and events.
- [x] Implement Storage upload helper.
- [x] Add `.env.example` with required `NEXT_PUBLIC_*` keys.

## 4) Security Rules and Config
- [x] Create `firestore.rules` with public-create + tokenized tracking snapshot + admin permissions.
- [x] Create `storage.rules` with constrained upload/read policy.
- [x] Add `firebase.json` hosting/firestore/storage configuration.

## 5) Public Experience
- [x] Build landing page (`/`).
- [x] Build report form page (`/report`) with validation.
- [x] Build upload dropzone with 3MB limit and friendly errors.
- [x] Build map picker using Leaflet + OSM.
- [x] Integrate TFJS classify flow in submit lifecycle.
- [x] Persist case + events in Firestore.
- [x] Show success UI with case ID + tracking token link.
- [x] Build tracking page `/track/[caseId]` with token gate and limited fields.

## 6) Admin Experience
- [x] Build admin login page (`/admin/login`) with Google sign-in.
- [x] Build admin dashboard (`/admin/dashboard`) with filters and list.
- [x] Build case detail page (`/admin/case/[caseId]`) with workflow actions.
- [x] Build admin map page (`/admin/map`) with filters + markers.
- [x] Add route guarding for admin-only pages.

## 7) Shared Components
- [x] `Navbar`
- [x] `CaseCard`
- [x] `StatusBadge`
- [x] `UploadDropzone`
- [x] `MapPicker`
- [x] `MapView`
- [x] `FiltersBar`
- [x] Loading/error/empty state components

## 8) Documentation
- [x] Write `README.md` with setup, Firebase provisioning, admin bootstrap, run/deploy.
- [x] Document static-export limitations and free-tier constraints.
- [x] Keep `prd.md` synchronized with implementation decisions.
- [x] Keep `checklist.md` synchronized and tick completed items.

## 9) Validation
- [ ] Verify TypeScript compile assumptions.
- [ ] Verify key flows manually (report, track, admin login, status transitions).
- [ ] Final pass on security/privacy and demo readiness.
