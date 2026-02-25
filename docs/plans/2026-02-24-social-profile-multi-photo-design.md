# Social Profile + Multi-Photo Feed Design

**Date:** 2026-02-24  
**Scope:** Add up to 3 photos per report, social-style feed cards, and public profile pages with username/avatar + follow/unfollow.

## Goals
- Allow up to 3 images per report submission.
- Render feed cards with 1-3 image grid matching provided reference style.
- Introduce public user profiles with:
  - avatar
  - username
  - email
  - followers count
  - following count
- Allow users to edit their own avatar and username.
- Support public simple follow/unfollow.

## Constraints and Compatibility
- Preserve current auth, reporting, and route behavior.
- Keep backward compatibility for older single-image reports.
- Maintain existing `photoUrl` fields while adding `photoUrls`.

## Data Model
- `users/{uid}`
  - `username: string`
  - `email: string`
  - `photoURL: string`
  - `createdAt`
  - `updatedAt`
- `follows/{followerUid_followingUid}`
  - `followerUid: string`
  - `followingUid: string`
  - `createdAt`
- `animals/{animalId}` additions:
  - `latestSightingPhotoUrls: string[]` (max 3)
- `animals/{animalId}/sightings/{sightingId}` additions:
  - `photoUrls: string[]` (max 3)
  - `photoPaths: string[]` (max 3)
  - retain existing `photoUrl`/`photoPath` for compatibility

## UI Behavior
- Report page:
  - select up to 3 files
  - upload all files
  - use first file as cover (`photoUrl`) for existing flows
- Feed page:
  - header row with avatar + username + reporter link
  - 3-column image grid for up to 3 images
- Profile page:
  - public profile hero with avatar/username/email/follow stats
  - own profile: edit username + avatar upload controls
  - other profile: follow/unfollow button

## Security Rules
- Add `users` and `follows` rules:
  - public reads
  - users can create/update only own profile doc
  - users can create/delete only own follow edge

## Testing Strategy
- TDD updates for:
  - upload dropzone multi-file selection and caps
  - feed rendering of username/avatar and multi-image grid
  - profile rendering of counts and follow/edit controls
  - payload builder compatibility for `photoUrls`

