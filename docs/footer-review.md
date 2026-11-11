# P34 footer review

Status: implemented for preview; Product Owner factual review and live acceptance are pending.
Lot will coordinate review. Do not merge/publish this draft until the review is complete.

## Deliverables

- Shared footer: About, Contact, Privacy, Terms on every page using the root layout.
- `/about`: independent Group 8 IS 401 project, offer-source and provider context.
- `/contact`: user-approved public email `lotstarr@gmail.com`; existing public GitHub issue tracker for website bugs; existing listing report workflow. No new submission form or invented mailbox.
- `/privacy`: describes current code behavior without promising sync, retention periods, account deletion controls, or analytics opt-outs that do not exist.
- `/terms`: offer eligibility/availability, independent provider rules, browser-local tracking, approximate map locations, external services, and reporting.
- Mobile layout: two-column footer links at narrow widths, 44px controls, visible focus, wrapped email/text, and reduced-motion-aware Back to top.

## Product Owner factual review before publishing

- Confirm the independent-project / no-endorsement wording and use of the Studeats name.
- Confirm that Lot is the public contact for general, account, and privacy requests and that public GitHub issues are suitable for nonsensitive bug reports.
- Confirm signup/profile information and image handling against deployed Supabase configuration (`src/lib/auth.ts`, `src/components/AccountForm.tsx`).
- Confirm browser-local saves/card use/search history remain accurate; update this copy when P03/P04/P05 ship (`src/lib/store.ts`).
- Confirm current analytics: device ID, account ID when available, signup email/name metadata, local backup up to 100 events, attempted Supabase writes (`src/lib/analytics.ts`, `src/lib/auth.ts`). Do not claim writes always succeed.
- Confirm map provider selection, optional geolocation, directions destinations, and external font/icon/error services (`MapCanvas.tsx`, `ui-bits.tsx`, root layout, `lovable-error-reporting.ts`).
- Confirm actual Supabase/Vercel/provider retention and handling of account/privacy requests operationally. No unverified retention or legal-compliance guarantees are stated in the pages.
- Review practical Terms wording and whether additional institutional/project requirements apply. This implementation does not certify legal compliance.

## Local verification

- 64 tests across 16 files passed, including all four route matches, footer destinations, approved email, and the distinct public issue tracker.
- Production build, changed-source ESLint, and diff whitespace checks passed.
- Browser: direct navigation to all four routes, footer link navigation, reload, and back from Contact to Privacy worked without a 404.
- At 320px all four pages had document width equal to viewport width and footer links measured 44px high. At 390px inspected footer wrapping and keyboard focus; at 1280px verified no horizontal overflow.
- Email links were inspected, not sent. No report or issue was submitted. Live verification remains pending.

## Acceptance check

Before marking P34 Done, attach the reviewed PR and deployed commit; verify all four live URLs directly and from Home, Calendar, and Map; test browser back, keyboard focus, email link, issue tracker, and narrow mobile layout. Do not send test email or publish a test issue.

Planned live URLs: `https://studeats.vercel.app/about`, `/contact`, `/privacy`, `/terms`. These are planned destinations, not a claim of deployment.
