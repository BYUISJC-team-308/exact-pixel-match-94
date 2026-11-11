# November 10 coding queue

Follow-up owner: Lot Holmstead (`lotholmstead`). Trello is the shared status source.
The nine regression groups below extend existing work rather than create duplicate features.
Lot was added to the related cards; existing members remain assigned for coordination.
Do not mark findings complete until the reviewed change is merged and verified live.

## Current draft

- [Homepage reset, PR #27](https://github.com/BYUISJC-team-308/exact-pixel-match-94/pull/27): three equal paths; requested heading and preview cleanup; instructional shortcuts; guest My Hub sign-in and return; colored header navigation with destination icons. Draft, awaiting review.
- My Hub saves remain browser-local. Account persistence belongs to P03/P04; this draft does not complete those features.

## Implementation order

| Order | Finding / work | Primary Trello card | Acceptance / coordination |
| --- | --- | --- | --- |
| 1 | React hydration mismatch #418 | [P32](https://trello.com/c/8y88a1xe) | Reproduce direct load/reload, find actual SSR/client mismatch, fix without suppressing it; verify all routes, guest and authenticated sessions. |
| 2 | False zero counts during loading | [P01](https://trello.com/c/TVmjzDJJ), [P20](https://trello.com/c/Nu11wNMy), [P28](https://trello.com/c/tDaHQOJP) | Distinguish pending, refreshing, failed, successful empty, and populated states; counts reflect current successful data. |
| 3 | Duplicate events in header search | [P21](https://trello.com/c/ugOpTdBR), [P12 dependency](https://trello.com/c/mmAfKr4e) | Deduplicate by canonical event identity, preserve different occurrences; investigate imports before changing records. |
| 4 | Enter does nothing in header search | [P21](https://trello.com/c/ugOpTdBR) | Meaningful query submission/selected result; keyboard and touch journeys, no-results guidance, Escape and back navigation. |
| 5 | Clipped header search placeholder | [P21](https://trello.com/c/ugOpTdBR) | Flexible input and clear short prompt at 320/390/430px; retain accessible label and usable clear controls. |
| 6 | Guest profile icon label/destination mismatch | [P02](https://trello.com/c/BR8NK9bD), [P28 wording](https://trello.com/c/tDaHQOJP) | Accurate guest account/sign-in and authenticated Profile destinations; handle pending/expired sessions. |
| 7 | Identical map location names | [P19](https://trello.com/c/pGlOBjkd) | Street/city context in selection/results; correct branch pin and directions, campus building/room context. |
| 8 | Truncated map attribution | [P19](https://trello.com/c/pGlOBjkd) | Provider-supported attribution remains readable and operable with mobile sheets/controls open. |
| 9 | Unclear room numbers | [P01](https://trello.com/c/TVmjzDJJ), [P28](https://trello.com/c/tDaHQOJP) | Explicit “Room 1170” consistently; no fabricated text when absent. |
| 10 | SORT wrapping on Card Hub | [Feature 16](https://trello.com/c/pws37VZp) | Reopened to Product Backlog; label/icon stay together, responsive controls, no horizontal overflow, full-catalog sorting preserved. |
| 11 | Full-catalog performance | [P33](https://trello.com/c/75DQ7uXl) | Measure all 633 offers (or current actual count), optimize from evidence; no silent truncation, search/filter/sort cover full data, record before/after mobile timing. |
| 12 | Footer About / Contact / Privacy / Terms | [P34](https://trello.com/c/DhHtPX4J) | Real working destinations, approved factual content/contact details, mobile wrapping, direct loads, keyboard/touch access. |

## Verification for each change

- Check current main and the existing owner's branch before coding; agree the integration boundary.
- Use a focused branch/PR and link it to the owning card. Add meaningful behavioral coverage and run the production build.
- Verify at 320, 390, and 430px plus desktop. Include slow loading, error/retry, empty data, keyboard, and touch scenarios relevant to the finding.
- Record the deployed commit, live URL, and regression evidence before moving to Done/acceptance.
- Keep these backlog items unsized until the team confirms remaining effort. Split anything over 8 Fibonacci points before sprint commitment.
