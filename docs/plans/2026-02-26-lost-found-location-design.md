# Lost & Found Location Text From Map Pin (Design)

Date: 2026-02-26

## Goal
Add a location selector to Lost & Found post creation so users can drop a pin, convert it to a readable text location, and store only the derived text (no coordinates). Lost & Found locations must not appear on public map pages.

## Context
The report flow already uses Leaflet + Nominatim reverse geocoding via `lib/geocoding.ts` and `components/MapPicker.tsx`. We will reuse this behavior for Lost & Found creation to keep UX consistent and avoid new dependencies.

## Requirements
- Allow users to drop a pin on a map during Lost & Found post creation.
- Convert the pin to a human-readable text label using existing reverse geocoding.
- Persist only the derived text in `lost_found_posts`; do not store lat/lng.
- Do not add Lost & Found pins to any map views or public map collections.
- If reverse geocoding fails, fall back to a coordinate string for display and allow submit.

## Approach Options
1. Reuse `MapPicker` + `reverseGeocode` in `/lost-found/new` (recommended)
2. Create a pin-only picker without search
3. Manual text input with optional map-assisted autofill

Chosen: Option 1 for consistency and minimal new code.

## Design
### UI / Components
- Add a "Location" section to `/lost-found/new`.
- Use `MapPicker` for selecting a pin.
- Display derived `locationLabel` text under the picker.
- Keep styling consistent with existing form inputs and labels.

### State
Client-only state in `/lost-found/new`:
- `location`: `{ lat, lng } | null`
- `locationLabel`: `string`
- `locationMessage`: status text (e.g., "Looking up location name...")

### Data Model
Add `locationText: string` to `lost_found_posts/{postId}`. No coordinate fields are persisted.

### Data Flow
1. User selects a pin in `MapPicker`.
2. `reverseGeocode(location)` resolves the label.
3. `locationLabel` is set and displayed.
4. On submit, write `locationText: locationLabel` to Firestore.

### Error Handling
- If reverse geocoding fails, fallback to `"{lat},{lng}"` in `locationLabel`.
- Allow submission with fallback label.

### Security / Privacy
- No changes to map read collections.
- Lost & Found posts remain public but store only derived text, not coordinates.

## Testing
- Update Lost & Found create flow tests to require `locationLabel` before submit.
- Add/extend data mapping tests for `lost_found_posts` to include `locationText`.

## Out of Scope
- Displaying Lost & Found posts on any map page.
- New geocoding providers or paid APIs.
