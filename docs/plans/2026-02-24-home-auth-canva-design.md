# Home/Auth Canva Redesign Design

**Date:** 2026-02-24  
**Scope:** Global visual polish with focused redesign for `/` and `/auth` to match provided Canva references.

## Goals
- Match the warm beige + brown rounded aesthetic from Canva.
- Preserve existing authentication and navigation behavior.
- Keep the redesign responsive and accessible.
- Use `public/images/hero-cat.png` as the shared hero image source.

## Approved Direction
1. Visual direction
- Script-like logo mark for `StrayLink` in navbar.
- Pill-style navigation states and warm neutral background.
- Hero container with rounded corners, cat image background, dark readable overlay, and bold white headline.

2. Functional protection
- Keep all existing handlers and route logic for:
  - auth observe and guest access state
  - login/register/google/guest actions
  - admin/user route branching

3. Architecture and files
- Update shared styles in `styles/globals.css`.
- Redesign `components/Navbar.tsx`, `app/page.tsx`, and `app/auth/page.tsx`.
- Update tests only where necessary.

## UX Notes
- Desktop:
  - Home: two-column composition over hero image, CTA bottom-right.
  - Auth: hero image background with right-side login/register panel.
- Mobile:
  - Stack sections with readable overlays and full-width controls.

## Asset Contract
- Expected image path: `public/images/hero-cat.png`.
- If missing, layout still renders but image area appears empty/neutral; user can add the file later without code changes.

