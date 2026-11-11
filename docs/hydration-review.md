# P32 — Hydration regression evidence

Owner: Lot Holmstead. Base main: `2310ddf6e34e9d0ebf22a536d4753f3568ddf520`.

## Reproduction and cause

On November 11, 2026 at 16:17:55 UTC, a fresh production `/calendar` reload with browser locale `fr-FR` reproduced minified React error #418. Ordinary English/Denver checks did not reproduce it. Browser locale was changed using Chrome's developer emulation; no app state or credentials were injected.

1. Open `https://studeats.vercel.app/calendar` directly, signed out.
2. Set the browser locale to French (`fr-FR`), with timezone `America/Denver`, and reload.
3. The server document says `Today is Wednesday, November 11`. The hydrated client says `Today is mercredi 11 novembre`; the month and day labels also differ.
4. React regenerates the tree and logs #418. The exact production stack is in [hydration-before-console.json](./hydration-before-console.json). The first reproduction used the browser’s default desktop viewport; its exact dimensions were not captured. The regression matrix explicitly sets 360 × 800 and 1280 × 800.

The root cause is render-time locale/time input, not evidence of invalid nesting or the browser-local store. Calendar used implicit-locale formatting and independent `new Date()` values. Map already serialized database rows but independently filtered/normalized them using the server/browser clock, allowing different visible event counts at midnight or an event-end boundary. Its friendly date formatting and countdown also used the browser's locale/timezone. React's documentation describes these exact mismatch classes: [error 418](https://react.dev/errors/418).

## Fix

- Calendar and Map route loaders serialize a `renderedAt` instant with SSR data. Both sides use that instant during hydration; browser time is read only in an effect after commit. Refreshes/new loader snapshots update the clock. No recurring timer rebuilds the map during panning.
- Use `en-US` explicitly for this English-language site's calendar/map/event labels.
- Derive event date offsets, upcoming-event inclusion, and countdowns from `America/Denver`, consistent with Utah event wall times. Day arithmetic uses date components in UTC to avoid daylight-saving-length days.
- Do not suppress hydration warnings or disable SSR.
- Existing `useSyncExternalStore` server snapshot remains intact. A regression test verifies local saves/preferences restore after hydration, ignores a legacy locally saved identity, and keeps the header in pending state until trusted auth restoration completes. No auth API/schema/persistence changes.

## Automated verification

`src/test/hydration.test.tsx` renders actual Calendar and Map markup on the server, hydrates it with a different clock, and collects React `onRecoverableError` results. Calendar also receives a different browser default locale. Both pass without mismatch. The Calendar test fails with the original component and shows the exact text diff (`Tuesday, November 10` → `mercredi 11 novembre`).

Additional tests cover auth pending → signed-in, browser-local saves, event-end filtering, Utah midnight, and the November daylight-saving boundary. Full suite, targeted ESLint, production build, and `git diff --check` are run for this change. Existing global TypeScript errors are separate; a clean project-wide typecheck is not claimed.

## Browser checks before deployment

Test environment: desktop Chromium in the in-app browser; local development server. `fr-FR` locale and `Asia/Tokyo` timezone deliberately differ from SSR. Viewports: 360 × 800 and 1280 × 800. Signed-in identity was established by the user through the normal sign-in form, with no test credentials/session injection.

| Route | Signed-out direct/reload | Signed-in direct/reload |
|---|---|---|
| Home `/` | Pass, both widths | Pass, both widths |
| Discounts `/discounts` | Pass, both widths | Pass, both widths |
| Card Hub `/starving-student` | Pass, both widths | Pass, both widths |
| Free Food `/free-food` | Pass, both widths | Pass, both widths |
| Calendar `/calendar` | Pass, both widths | Pass, both widths |
| Map `/map` | Pass, both widths | Pass, both widths |
| Profile `/profile` | Guest prompt, both widths | Real profile form, both widths |
| Sign-in `/signin` | Form, both widths | Form, both widths |

All completed with zero hydration/invalid-nesting errors in captured console logs. Expected route headings were checked after client navigation, rather than assuming a changed URL meant a transition was complete. Production checks and deployed SHA are recorded on P32 after deployment; leave the card open until they pass.

Separate existing warning: session analytics cannot insert into `user_activity_logs` (`permission denied`). That database authorization problem is not a hydration mismatch and was not hidden or changed by P32. Missing source event dates/times and their fallbacks remain a P01 data-contract follow-up.

## Final regression procedure

After deployment, directly load and reload all eight routes signed out and signed in at both widths, waiting for the account control and page heading. Navigate via header links and the profile/sign-in recovery links. Check month navigation/Today, campus/area toggles, filters, and details. Record live URL, deployed merge SHA, observed errors, and viewport evidence on the card. Human/physical-device review remains separate from these browser checks.
