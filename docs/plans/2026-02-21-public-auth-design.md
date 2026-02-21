# Public Authentication Design (Email/Password + Guest)

Date: 2026-02-21

## Objective
Add a public authentication entry point that keeps the existing mission-focused homepage while providing login, registration, and guest access for public users.

## Scope
- Keep existing admin authentication at `/admin/login` unchanged.
- Add public auth page at `/auth` with:
  - Login (email/password)
  - Register (email/password)
  - Join as Guest (no Firebase Auth session)
- Update homepage CTA to route users to `/auth`.
- Redirect successful public login/registration and guest access to `/report`.

## UX Design
### Homepage (`/`)
- Continue presenting app mission/goals.
- Add a clear public CTA (`Login / Join`) pointing to `/auth`.
- Keep admin CTA available via `/admin/login` for operator flow.

### Public Auth (`/auth`)
- Toggle/tab between `Login` and `Register` modes.
- Shared form fields:
  - Email
  - Password
- Primary action label changes by mode (`Login` or `Create account`).
- Secondary action: `Join as Guest`.
- Status handling:
  - Disabled button while submitting
  - Friendly inline/toast error for auth failures

## Technical Design
### Routing
- Create `app/auth/page.tsx` as client component.
- Keep `app/admin/login/page.tsx` unchanged.

### Auth API
- Extend `lib/auth.ts` with:
  - `registerWithEmail(email, password)` using `createUserWithEmailAndPassword`
  - `loginWithEmail(email, password)` using `signInWithEmailAndPassword`
- Do not add anonymous auth for guest path.

### Redirect Behavior
- On successful login/register -> `router.push('/report')`
- On guest -> `router.push('/report')`

### Error Handling
Map Firebase auth errors to user-friendly messages for common cases:
- invalid email
- email already in use
- wrong password / invalid credentials
- weak password

## Data and Security Impact
- No Firestore schema changes.
- No rules changes required.
- Public report flow remains compatible with unauthenticated users.
- Admin auth/authorization remains isolated.

## Testing Strategy
- Unit/component tests for `/auth` page:
  - mode toggle rendering
  - login calls email sign-in helper
  - register calls create-account helper
  - guest navigation bypasses auth helper
  - error state message appears on failure
- Regression check for existing admin login page.

## Documentation Updates
- Update `prd.md` role/auth sections to include optional public account access + guest path.
- Update `checklist.md` with new completed items for public auth page and homepage CTA update.
