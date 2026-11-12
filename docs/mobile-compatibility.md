# Mobile compatibility audit and implementation

## Scope

Reviewed Home, Discounts, Starving Student Card (list and grid), Free Food, Calendar, both map views, Account, Sign In, Profile, and Help. Shared detail, report, event submission, analytics, and reset confirmation dialogs use the same responsive container. No database/schema changes.

## Findings and resulting behavior

| Area | Problem | Change |
| --- | --- | --- |
| Shared layout | Large padding and intrinsic flex/grid widths squeezed phone content | Safe-area-aware gutters, shrinkable children, long-text wrapping, smaller phone headings |
| Navigation | Full desktop navigation competed with search/account controls near 1024px | Keep expandable navigation through tablet widths; scroll long expanded menus |
| Controls/forms | Small targets, small form text, crowded date/time fields | At least 44px-high primary controls on phones, 16px form text, single-column submission fields, linked labels and autofill hints |
| Detail and form dialogs | Long contents extended beyond the screen; background could scroll; close button competed with headings | Portal dialogs with focus containment, background scroll locking, persistent close row, internally scrollable content, focus restoration, nested-dialog handling |
| Virtual keyboard | Layout viewport can remain larger than the visible screen | VisualViewport resize/scroll events adjust dialog height and position; CSS dynamic-height fallback |
| Calendar | Seven columns showed tiny, truncated event labels | Phone defaults to day agenda; month cells show counts and accessible date/count names; tap opens agenda; desktop retains both panels |
| Maps | Fixed 500px minimum height; fixed-width campus selector; popup competed with mobile results; content scrolling triggered swipe-to-close | Flexible map height, stacked selector, resize observation, one phone/tablet details sheet, explicit expand/collapse and close buttons |
| Profile/account | Unwrapped action row and cramped photo/form controls | Wrapping actions, smaller phone padding, shrink-resistant avatar, keyboard-accessible photo upload |
| Motion | Animated entrances regardless of preference | Respect prefers-reduced-motion |

## Verified locally

- Measured all ten routes at 320, 360, 390, 430, 768, 1024, and 1280 CSS pixels, plus 844×390 landscape (80 combinations): no horizontal document overflow. Browser viewport checks use Chromium, not device simulators.
- Inspected the campus selector/map controls at 320px, month/day switching at 390px, and an event form at 320×568. Its form body scrolls while the close control remains visible; the Publish/Cancel controls are reachable.
- Exercised map search → location sheet → full offer details, a direct canvas pin click reopening the sheet, Google/Apple direction link destinations, event details, search/navigation, Help, and dialog dismissal. Did not publish test events or alter production account data.
- Regression tests cover dialog focus/scroll lock/restoration, nested dismissal, visual-viewport changes, and calendar date/agenda switching. Existing account/homepage/data tests remain in the suite.

## Physical-device release checks still needed

- iPhone Safari and Android Chrome: portrait/landscape, keyboard open, browser toolbar expanded/collapsed, and pinch/text zoom.
- Sign in with a team test account; verify profile editing, photo picker, saved-item and punch behavior using existing account/storage implementations.
- On-device map pan/pinch and location permission allowed/denied; open Google/Apple Maps using a real installed app.
- Test event submission against a designated test environment rather than creating fake events in the production feed.
- These layout changes do not implement account-backed saves, change data accuracy, or certify complete WCAG compliance.

## Research used

- [web.dev: Responsive web design basics](https://web.dev/articles/responsive-web-design-basics): viewport configuration, flexible content and content-driven breakpoints.
- [W3C: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): support a 320 CSS pixel viewport without two-dimensional page scrolling (maps have a specific exception).
- [W3C: Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): minimum target sizing/spacing. This implementation uses a more comfortable 44px height for phone controls; calendar cells retain spaced seven-column geometry.
- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport): keyboard/zoom may shrink the visual viewport independently of the layout viewport.
- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog): portal, focus containment, accessible names, Escape handling, controlled nested dialogs.

## November 12, 2026 regression audit

Reviewed main `8cdeeab` in the browser before this patch. Homepage design is unchanged pending team feedback.

- Direct-load layout checks: Home, Discounts, Card Hub, Free Food, Calendar, Map, Account, Sign in, Profile, Help, About, Contact, Privacy, Terms. No document horizontal overflow at 320×640, 360×800, 430×800, or landscape 740×360 (56 route/viewport checks). These are layout checks, not a claim that every control was exercised.
- Signed-in live checks: free-food submission form opens/closes without submitting; discount details show redemption, voting, save and report controls; map list opens, location selection opens both offers, full offer details open/close, directions expose Google/Apple coordinate destinations, and campus view exposes BYU/UVU selection and date controls. No production records changed in this audit.
- At 740×360 the discount modal stayed within the viewport (top 12px, bottom 348px), with 275px of independently scrollable body content. At 320×640 the event form stayed within top/bottom 12px margins.
- Reproduced header search Enter doing nothing. Fixed Enter to open the first displayed match, added mobile focus and keyboard Go hint, Escape focus return, mutual exclusion with the mobile menu, and a shorter placeholder. Added Sign in to the guest mobile menu (desktop already had it).
- Local browser check confirmed search focuses on open and Enter navigates to `/calendar`. Regression tests also cover menu closure, Escape focus, and guest sign-in access.
- Validation: 108 tests passed; production build passed; changed-file ESLint and `git diff --check` passed.

Remaining limits: browser viewport emulation is not a physical iPhone/Android test; native keyboard behavior, VoiceOver/TalkBack, location permission flows, slow-network performance and every possible save/vote/submission mutation were not exercised here. Existing test-labelled community events and questionable source end times remain data-review work; this patch does not alter them. Header result destinations retain existing page-level navigation semantics.
