# Student Steals homepage preview

Based on the November 12 discussion with Bryce and the reference sketch. Student Steals is the approved name. This branch is a review preview; production is not changed or merged by this task.

## Behavior and scope

- Shared wordmark, mask SVG/favicon, page titles, footer and visible brand references use Student Steals. Provider name Starving Student Card, existing URLs, database configuration, storage keys and saved data are unchanged.
- Home's oversized visible title is replaced by an accessible screen-reader heading. Three image tiles use white/pale-green backgrounds, deep-green text, clear conditions and full-card links. They stack with compact thumbnails on phones; desktop shows three equal image cards.
- Header retains search, an account disclosure and a navigation menu at all sizes. Guest options are Sign in/Create account; members get My profile/Sign out through the existing auth flow. Search, menu and account panels are mutually exclusive; outside taps dismiss them, and account/menu Escape restores toggle focus. Expanded navigation is white/green rather than multicolor bubbles.
- Today on Campus and My Hub markup, data selection, counts, loading/error states, save behavior and desktop/mobile layout are byte-for-byte unchanged from main `2f14d6c` below the shortcuts section. Existing Map/Calendar/My Hub/Help shortcuts remain.
- No slogan, authentication-provider change, username-login work, new database behavior or provider offer changes.

## Assets

Images are local assets, not runtime third-party image requests. Decorative image alternatives are empty because adjacent headings describe each link. Fixed media regions reserve layout space. Combined JPEG assets are about 315 KiB.

- `student-discounts.jpg`: illustrative retail photograph from https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80 (Unsplash). It is not a participating-business claim.
- `free-food-pizza.jpg`: illustrative pizza photograph from https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80 (Unsplash). It is not a specific event/menu claim.
- `starving-student-app.jpg`: current official Starving Student Card App icon from Apple's app listing (app ID 1482047241), retrieved through https://itunes.apple.com/lookup?id=1482047241. Physical-card imagery found during research was outdated; this preview uses the actual app artwork rather than presenting an old offer card as current.
- `student-steals-mark.svg`: original code-native mask mark; independent of the provider's brand.

## Validation

- 113 tests passed, including hydration/session restoration, header search/menu/account behavior, sign-out dispatch and unchanged homepage save/event journeys. Production build passed; diff whitespace check passed.
- Chromium browser checks at actual 320, 360, 390, 430, 768 and 1280px viewport widths: no document overflow; all three local images loaded; stacked tiles below 768px and three columns at/above 768px.
- Clicked all three tiles to Discount Dashboard, Card Hub and Free Food, then returned using the wordmark. Guest account destinations, menu dismissal and Enter search navigation checked in the browser. Member account/sign-out behavior covered with mocked auth; no production account changes made.
- Physical iPhone/Android checks and Product Owner visual review remain. Existing source data/test-labelled events are outside this branding preview.
