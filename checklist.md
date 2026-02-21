# StrayLink MVP Checklist

## Existing Case Workflow (Legacy)
- [x] Legacy report + admin case lifecycle implemented.
- [ ] Legacy hosting/export constraints still need final resolution.

## New Feature: Stray Feed + Last Seen Map (MVP, no AI merge)

### 1) Planning + Data Contract
- [x] Define Firestore schema for `animals`, `animals/{animalId}/sightings`, and `comments` under each sighting.
- [x] Add TypeScript interfaces and helper payload builders for the new schema.
- [ ] Document final schema in `prd.md` after MVP routes are complete.

### 2) Security + Storage Foundations
- [x] Add Firestore rules for public reads (`animals/sightings/comments`) and auth-required writes.
- [x] Preserve existing admin-gated collections and behavior.
- [x] Add Storage path for sighting photos (`animals/{animalId}/sightings/*`) with auth + image/size checks.
- [ ] Deploy updated rules (`firebase deploy --only firestore:rules,storage`).

### 3) MVP Create Sighting Flow (One sighting = new animal thread)
- [x] Update `/report` to create a new animal thread with first sighting.
- [x] Upload photo to Storage and store `photoUrl` + `photoPath`.
- [x] Capture map location and save as GeoPoint for sighting + animal last seen.
- [x] Add mobile camera-friendly file input (`accept="image/*" capture="environment"`).
- [ ] Add automated tests for `/report` submit flow.

### 4) Feed Page (`/feed`)
- [x] Build feed query over latest sightings (descending by `createdAt`).
- [x] Render Instagram-style cards with photo, caption, time, type, and links.
- [x] Add link to `/animal?id=<animalId>` and map focus link.

### 5) Animal Profile (`/animal?id=<animalId>`)
- [x] Render animal header (type, cover image, last seen fields).
- [x] Render timeline/gallery of all sightings (newest first).
- [ ] Show location history list (and mini map if feasible in MVP).
- [ ] Add comment composer + list under sightings.

### 6) Public Map (`/map`)
- [x] Switch marker source to `animals` collection (`lastSeenLocation`).
- [x] Keep one marker per animal thread.
- [x] Marker click opens `/animal?id=<animalId>`.

### 7) Verification + Cleanup
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Manual verify: signed-in user can submit sighting and docs appear in Firestore.
- [ ] Manual verify: public can read map/feed data, unauthenticated write is denied.
