# BYU Handshake food review — November 12, 2026

Reviewed the authenticated BYU Events directory, which displayed 29 upcoming listings. Opened all 22 non-virtual listings; excluded three outside BYU, expanded descriptions on the remaining 19, and visually reviewed the Connectathon calendar attachment. This is an account-visible snapshot, not a complete census of campus events or a running login scraper. Handshake does not cover all clubs or university calendars.

## Published food-provided events

| Event | Local time (America/Denver) | Location | Source evidence |
| --- | --- | --- | --- |
| Intermountain Health AI Internship information session | Nov 12, 4–5 PM | JKB, Room 2107 | [Organizer listing](https://byu.joinhandshake.com/stu/events/2050605): food provided, menu unstated |
| Clarins USA information session | Nov 13, 11 AM–12:30 PM | TNRB, Room 7110 (710), as listed | [Organizer listing](https://byu.joinhandshake.com/stu/events/2057796): pizza provided |
| AI Day | Nov 16, 2–7 PM | WSC Garden Court | [Organizer listing](https://byu.joinhandshake.com/stu/events/2056333): pizza provided, serving time unstated |

No food price was advertised. This supports “food provided,” not a guarantee of unrestricted admission or unlimited food. Stored summaries explicitly distinguish unknown costs, registration rules, capacity, deadlines, dietary options, quantities and serving times. Each has a source URL, check date, local start/end, host, official BYU building/campus IDs, building coordinates and room. Pin coordinates identify the building, not a room entrance. No organizer contact details or attendee lists were copied.

## Pending or excluded

- Connectathon: flyer confirms Friday Nov 13 cookies/hot cocoa in front of JFSB, but no time. Preserved as a draft in the snapshot, not inserted with an invented time. Wednesday Nov 11 pizza is past. Thursday Lunch and Learn has no explicit food-provided promise.
- RevBlack: header/description disagree on the dates for both tabling and information sessions. No food promise; not imported.
- Concora Credit: header says JFSB B002, description B060. No food promise; not imported.
- Other possible BYU listings did not promise food in expanded descriptions. Seven virtual-only listings and three outside-BYU events excluded. Full source ID accounting is in the JSON snapshot.

## Reuse

`data/imports/handshake-byu-2026-11-12.json` is a curated snapshot. `node scripts/import-handshake-food.mjs` validates and previews it; pass `--apply` to insert after review. Supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or an authorized service role credential) in the environment. Keys are not stored in the new importer. The importer uses existing database permissions, resolves official buildings, skips past dates, checks source and title/date duplicates, and uses stable source UUIDs; it never overwrites existing events. It does not run legacy seed/scraper scripts, invent upcoming dates, or establish an unattended Handshake session.

Three rows inserted successfully into live `food_events`. A repeat dry-run must show zero pending rows. Unknown-time drafts require organizer confirmation before importing; don't use midnight/noon defaults. Event descriptions now preserve paragraph breaks and expose a direct Handshake registration/source link with an organizer-listing badge rather than claiming independent verification.

Validation: 112 tests passed and production build passed. Repeat dry-run reports three duplicates and zero pending inserts. Existing feed contains test-labelled events and some inconsistent end times; those rows were not edited or deleted by this import and are not certified by this review.
