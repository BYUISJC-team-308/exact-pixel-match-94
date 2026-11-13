# P18 — profile field and photo editing

Owner: Lot Holmstead, taking over Feature 9 follow-up with Product Owner authorization. Date: November 13, 2026. Proposed board estimate remains 5 points; team confirms sprint commitment.

## Scope and behavior

- `/profile` edits full name (1–100 characters), username (3–30 characters), optional phone (up to 20 characters; at least 7 digits when supplied), and photo. Values are trimmed.
- Email is read-only and comes from Supabase Auth. School is displayed, but this editor never writes school/interests (P17), saved items (P03/P04), passwords, roles, or account identity. Signup remains the existing AccountForm flow.
- Save is explicit. Cancel restores the last confirmed values and photo. Changes show a saving state; repeated submissions and edits are disabled while saving. Server rejection leaves entered values available for retry. Username conflicts have a specific message.
- Photos accept JPEG/PNG/WebP, nonempty, at most 2 MiB. Browser decoding rejects unreadable images and images over 25 million pixels. Preview alone never uploads. File errors are announced; controls have visible focus and at least 44px touch targets.
- The authenticated user is verified before writing. Reads/updates filter by that user ID; changing account during an edit is rejected. Profile state is updated from the returned database row, retaining ID and authoritative account fields.

## Verified backend, not a proposed schema

Live SQL audit: `public.profiles` already has `id`, `username`, `full_name`, `email`, `school`, `phone`, `avatar_url`, `created_at`, and `last_sign_in_at`. RLS is enabled and existing select/update policies constrain rows to `auth.uid() = id`. There were no storage buckets at audit time. Existing policies were retained.

Applied `20261113000400_profile_avatar_storage.sql` to project `zwygwfcaollyotvfwumx` on November 13. It adds the private `profile-avatars` bucket, a 2 MiB size limit, JPEG/PNG/WebP MIME restrictions, and owner-folder SELECT/INSERT/DELETE policies. No object UPDATE policy is added. Filenames are immutable `<auth-user-id>/<random-uuid>.<extension>`.

`profiles.avatar_url` stores the object path for new uploads. On profile/session load, the client requests a signed link valid for up to seven days. No service credential is used in browser code. Existing data-image/URL avatars remain readable for compatibility; this card does not migrate signup's legacy image flow. A signed link can be used by anyone holding it until it expires, so the bucket itself is not public.

Replacement uploads a new object first, confirms the database reference, then deletes the previous owned storage object. Removal clears the reference before deleting its object. Known database rejections attempt to remove the unused new upload. Ambiguous transport failures retain the new object, because the write may have committed; users are told to retry or reload to check. Cleanup failure is reported rather than claiming storage deletion succeeded. This can leave private orphan objects needing support cleanup; no automatic orphan sweeper is claimed. Old objects/URLs outside the current user's owned bucket path are never deleted.

Profile fields and photo references are stored in Supabase and loaded on a subsequent authenticated device/session. A separate-device demonstration still requires a second signed-in session.

## Validation evidence

- All 147 tests passed across 27 test files. Production build passed.
- Automated coverage includes file size/type rejection; signed-out/account-switch protection; upload failure; duplicate username and database rejection; ambiguous write response; photo removal and cleanup failure; legacy avatars; failed signed-link delivery; no accidental writes to provider/preference fields; form retry/cancel/saving state.
- PostgreSQL/PGlite executes the actual migration twice and verifies owner reads/inserts/deletes, rejected cross-owner inserts, and denied object overwrites. Bucket MIME/size metadata is asserted.
- Live Supabase transaction probe returned `own_visible=1`, `other_visible=0`; a cross-owner object insert was rejected by RLS. All probe object rows were rolled back.
- Mobile layout evidence: [390px sample-data preview](evidence/p18-profile-mobile-preview.png).
- Isolated browser layout fixture (sample data, not a signed-in end-to-end test): no horizontal overflow at 320, 390, 430, or 1280px. Name/username/phone fields fit, action buttons measure 44px high. Valid sample JPEG previews, SVG selection is rejected, and Cancel restores the prior state. Fixture is removed before commit.
- A sign-in request is pending for the complete real-account browser save/reload/replacement/removal journey. Production rollout and live regression evidence are not yet completed. The card must remain open until those checks pass.
- Repository-wide TypeScript checking has existing errors in MapCanvas, header, routes and other modules. New profile service/editor/test files introduce no TypeScript diagnostics; production compilation succeeds. No accessibility score of 90 is claimed without a measured audit.

## Final acceptance checklist

1. Sign in to the preview. Change a supported field, save, reload, and verify the confirmed value. Restore the original value afterward if testing an existing real account.
2. Upload a disposable sample photo, save and reload; replace it, then remove it. Confirm the header and profile update and that old storage objects are removed after confirmed writes. Do not replace a real existing photo without retaining a recoverable copy.
3. Sign in on another device/browser and confirm profile values are loaded from Supabase.
4. Use network failure simulation to verify retry behavior in addition to automated service tests; recheck expired-session recovery.
5. Run the team's accessibility audit against the complete signed-in page (target ≥90), then merge/release and attach the PR, deployed commit, live `/profile` URL, viewports and real-account evidence. Record actual development time with the Trello timer; no historical timer duration is invented here.
