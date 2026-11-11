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
