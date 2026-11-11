# P28 student copy review

Status: proposed wording, ready for Product Owner review. New-tester and live acceptance remain pending.
Baseline: main `81f222ca39010e652553a8abf27f0c7c8c933171`.
Owner of this regression follow-up: Lot Holmstead. Coordinate with the existing P28/P01/P02/P20 owners; this change does not take over their larger implementations.

## Copy inventory

| Page / state | Previous wording | Proposed wording | Evidence / reason |
| --- | --- | --- | --- |
| Account introduction | “Free forever”; account signup to save deals/events | “Your student profile”; account stores profile details; saves/tracking stay on this browser | `auth.ts` stores profile fields in Supabase; `store.ts` saves item IDs and punches locally. No lifetime pricing promise is established. |
| Account search/metadata | “Save deals and events with a free Studeats account” | “Create and manage your Studeats profile” / “Create your student profile” | No account-backed saved-item writes in current main. P03/P04 own synchronization. |
| Sign in | No explanation of local saves | Email/password guidance plus browser-local saves | Current sign-in uses Supabase Auth; sign-in does not migrate browser saves. |
| Guest profile | “No account yet”; “Create one to save deals and events” | “Sign in to your profile”; view/edit name, school, photo; saves stay in this browser | Signed out does not prove someone has never created an account. |
| Profile pending / success | “Loading…” / “Changes saved” | “Checking your account…” / “Profile changes saved” | Distinguishes session restoration from saved offers. |
| Header account icon | “Profile” → signup page for guests | “Create account” → `/account`; “Profile” → `/profile` for members; pending account status before session restoration | Destination and screen-reader label now agree. Existing guest destination is preserved for P02. |
| Account form busy | Same submit label while disabled | “Creating account…” or “Saving profile…” | Existing busy state is reused; no submission behavior changes. |
| Discounts count | “0 verified student discounts” while pending | “Loading discounts…” / “Discounts couldn’t load” / successful count of student discounts | Existing query state distinguishes failure/pending from a successful empty response. No verification-status field is checked. |
| Discounts preview / detail | Generic business taglines, “Verified Discount” | Category + “Check provider terms”; eligibility/purchase reminder | Keeps actual listing description and redemption instructions; avoids unsupported editorial endorsement. |
| Discounts empty | Scraper scans sources “every morning” | “No discounts are listed here right now. Try another category or check the provider directly.” | Code does not establish a successful daily run or complete merchant coverage. Automation itself remains unchanged. |
| Discount / food load failures | “from database”; raw backend error or “Unknown error” | Plain connection/retry guidance | Users need a recovery action; technical error details are not a product explanation. |
| Free-food count | “0 … happening today” while pending | Loading/failure wording; successful “N … listed for today” | A feed count does not establish every event actually happening or food availability. |
| Food list empty action | “Post a Food Event” vs “Share Free Food” | “Share Free Food” consistently | Uses the same existing event-submission flow. |
| Calendar count/error | Zero-count day labels and empty-day message after failed reads | Loading/failure labels; retry; empty-day copy only after success | Uses existing query `isLoading/isError/refetch`; no new query/schema. |
| Calendar empty | “No events or specials scheduled…” | “No events or specials are listed…” | This listing feed is not an authoritative schedule for all campus events. |
| Calendar export | “one-click Google Calendar sync”; “.ics” | “add an event to your calendar”; “Add to Google Calendar”; “Download calendar file” | `calendar-sync.ts` opens a prefilled event or downloads a file; it does not establish ongoing two-way sync. |
| Home, food list, calendar, map and popup | Bare numbers or repeated `Room Rm 1170` | “Room 1170”; named room “Room: Gallery”; missing detail “Not provided” | Shared display-only `roomLabel()` normalizes prefixes without editing stored room values or building matching. |
| Food fields missing | “Campus Host”, “Free Food”, “Campus” | “Organizer not provided”, “Food not specified”, “Location not provided” | Missing fields do not establish a host, menu, or campus location. Location chip avoids a positive area claim for this fallback. |
| Card-offer detail locations | “Available at N verified locations” | “Listed at N locations” | Presence in the catalog does not prove availability or verification. Portal/source instructions stay visible. |
| Map intro / controls | “Find something worth the walk”; “unlock distance filters” | “Find deals and food nearby”; “Use the map’s location button to filter by distance” | Concrete task wording; geolocation behavior remains unchanged. |
| Map unknown locations | Verification/process wording and a private API explanation | “a location we can’t place on the map”; use official campus map when a UVU pin is missing | Does not invent verification status or expose irrelevant implementation details. |
| Help | Three paths and local-save explanation already present | Retained; adds purchase conditions for card offers and actual account benefits | General student discounts may have eligibility rules; card offers may require an active card and a purchase; food events have attendance requirements. P08 owns structured terms. |
| Not found | “This page isn’t on the board” | “This page couldn’t be found” | Removes project-board jargon from a website error. |

## Scope and coordination

- No schema, authentication API, password recovery, import schedule, analytics contract, or saved-item persistence changes.
- No naming/rebrand decision. The user-approved homepage heading and three-path layout are retained.
- AI automation and scraping code remain intact. Merchant/source offer terms remain intact; this is not P13 data cleanup.
- P01/P20: count/error/room-display fixes are shared-copy regression work only. Event dates, deduplication, and feed alignment remain separate.
- P02: guest icon labels match existing destinations; pending account state gets a status label. No new auth flow.
- P33 is a separate open PR; its card-rendering/pagination file is untouched to avoid overlapping implementation.
- **P01 follow-up:** normalization still substitutes dates/times when source fields are missing. Correct unknown-date/time modeling, exports, and countdown behavior together in P01; no attempt is made here to mask that data issue with a copy-only claim.

## Review before acceptance

Local verification:

- 77 tests across 17 files passed. New coverage checks pending/paused requests, error/retry versus true zero counts, guest/member/pending account labels and profile states, room prefixes, and missing food/organizer/location fields.
- Production build and whitespace checks passed. Lint passed for formatted copy files. Legacy map/detail/data files received semantic lint with only their existing Fast Refresh warnings; their broad pre-existing formatting was preserved. Repository-wide TypeScript errors remain; no clean global typecheck is claimed.
- Browser: Home, Help, guest Profile, Discounts, Free Food, and Calendar checked at 390px; Calendar at 360px, Map at 430px, and Help at 1280px. No horizontal overflow in those views. Verified guest icon label/destination and a real card detail’s “Listed at 1 location” wording. No form was submitted or account created.
- Signed-in and failure states were exercised through automated component tests, not a fabricated live login. No physical-phone/new-user study or accessibility score is claimed.

Product Owner: approve the table and the public wording in the preview. Do not treat “proposed” as approved until that review is recorded.

Ask a new tester, without explaining the site first:

1. What is the difference between student discounts, card offers, and free-food events?
2. Which offers might require a purchase or an active card? Where would you check?
3. What does an account save, and will saved offers follow you to another browser?

Record their answers and any confusing words. Then merge reviewed code, verify live pages, and attach PR, deployed commit, phone viewport, and evidence to P28. A physical-device/new-tester review and an accessibility score of at least 90 remain acceptance checks; no score or human test result is invented here.
