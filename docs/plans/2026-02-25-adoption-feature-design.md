# Adoption Feature Design

**Date:** 2026-02-25
**Status:** Approved by user in chat

## Goal
Add an adoption workflow where the public can browse adoptable pets and contact shelters, while only admins and shelter-role accounts can publish adoption posts.

## Scope
- Add `Adoption` nav item after `Feed`.
- Add public adoption browsing and detail/contact routes.
- Add protected adoption post creation route for `admin` or `shelter` role.
- Add admin role-management page to grant/revoke shelter role by UID.
- Add Firestore security rules for `shelters` and `adoption_posts`.
- Update PRD and README.

## Data Model
1. `shelters/{uid}`
- `enabled: boolean`
- `shelterName: string`
- `contactEmail: string`
- `phone: string`
- `address: string`
- `createdAt`, `updatedAt`

2. `adoption_posts/{postId}`
- `createdBy`, `createdByEmail`
- `shelterUid`, `shelterName`
- `petName`, `petType`, `ageText`, `description`
- `photoUrl`, `photoPath`
- `contactEmail`, `phone`, `address`
- `status: "available" | "adopted"`
- `createdAt`

## Permissions Model
- Public users: read/list `adoption_posts`.
- Shelter users: create `adoption_posts`, update/delete own posts.
- Admin users: create/update/delete all `adoption_posts` and all `shelters` docs.
- Regular authenticated users: no adoption create access.

## UX and Routing
- Navbar: `Home, Post, Map, Feed, Adoption, ...`
- `/adoption`: list cards for all available/adoptable pets.
- `/adoption/[id]`: post detail with pet info and contact CTA.
- `/adoption/contact/[id]`: shelter information view.
- `/adoption/new`: create form; visible button only for admin/shelter.
- `/admin/shelters`: admin panel to set shelter role and contact profile by UID.

## Technical Integration Notes
- Reuse existing role check pattern from `admins/{uid}` by introducing `isUserShelter(uid)` helper.
- Keep auth routing unchanged: `/auth` continues routing admins to dashboard and other users to `/report`.
- Use existing upload pattern (`uploadLostFoundImage` style) for adoption image storage path.
- Use existing UI primitives and warm theme tokens.

## Risks and Mitigations
- Risk: Admin enters wrong UID when granting role.
  - Mitigation: show clear helper text and explicit UID input label.
- Risk: Unauthorized writes via client tampering.
  - Mitigation: enforce writes in Firestore rules with role checks.
- Risk: Missing tests around role gating and nav link order.
  - Mitigation: add focused tests for navbar, role checks, and adoption list rendering.

## Testing Strategy
- Unit tests for `lib/auth` role checks and route behavior that depends on role.
- Component tests for navbar link rendering and adoption list page.
- Verify with `npm run test`, `npm run lint`, `npm run typecheck`.