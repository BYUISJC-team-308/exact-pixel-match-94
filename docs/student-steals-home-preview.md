# Student Steals homepage preview

Based on the November 12 discussion with Bryce and the reference sketch. Student Steals is the approved name. This branch is a review preview; production is not changed or merged by this task.

## Behavior and scope

- Shared wordmark, mask SVG/favicon, page titles, footer and visible brand references use Student Steals. Provider name Starving Student Card, existing URLs, database configuration, storage keys and saved data are unchanged.
- Home's oversized visible title is replaced by an accessible screen-reader heading. Three image tiles use white/pale-green backgrounds, deep-green text, clear conditions and full-card links. They stack with compact thumbnails on phones; desktop shows three equal image cards.
- Header retains search, an account disclosure and a navigation menu at all sizes. Guest options are Sign in/Create account; members get My profile/Sign out through the existing auth flow. Search, menu and account panels are mutually exclusive; outside taps dismiss them, and account/menu Escape restores toggle focus. Expanded navigation is white/green rather than multicolor bubbles.
- Today on Campus and My Hub retain their data selection, counts, loading/error states, save behavior and desktop/mobile layout. Their visual styling was subsequently unified with the deeper forest-green palette at the Product Owner’s request. The Map/Calendar/My Hub/Help shortcut tile row was removed following Product Owner visual review; Map and Calendar remain in the main menu.
- No slogan, authentication-provider change, username-login work, new database behavior or provider offer changes.

## Assets

Images are local assets, not runtime third-party image requests. Decorative image alternatives are empty because adjacent headings describe each link. Fixed media regions reserve layout space. Combined JPEG assets are about 350 KiB; the discount illustration is a lightweight SVG.

- `student-discounts.svg`: original code-native white price tag and percent illustration on forest green; replaces the retail photograph so the tile represents all discount categories.
- `free-food-pizza.jpg`: illustrative pizza photograph from https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80 (Unsplash). It is not a specific event/menu claim.
- `starving-student-card-2027.jpg`: the official current black Utah County card preview, linked from https://www.starvingstudentcards.com/. Published asset: https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/sites/154285/images/c45aa23-c7-253f-afae-b71dfe48ac_SAMPLE-BLACK-2027-thumb.jpg . Cover is marked October 1, 2027. CSS clips the cover from the fold-out artwork and turns it upright; a slight angle and shadow give it a card presentation. This is real provider artwork, not a photograph of a physical card. Old app-icon asset removed.
- `student-steals-mark.svg`: original code-native mask mark; independent of the provider's brand.

## Validation

- 113 tests passed, including hydration/session restoration, header search/menu/account behavior, sign-out dispatch and unchanged homepage save/event journeys. Production build passed; diff whitespace check passed.
- Chromium browser checks at actual 320, 360, 390, 430, 768 and 1280px viewport widths: no document overflow; all three local images loaded; stacked tiles below 768px and three columns at/above 768px.
- Clicked all three tiles to Discount Dashboard, Card Hub and Free Food, then returned using the wordmark. Guest account destinations, menu dismissal and Enter search navigation checked in the browser. Member account/sign-out behavior covered with mocked auth; no production account changes made.
- Physical iPhone/Android checks and Product Owner visual review remain. Existing source data/test-labelled events are outside this branding preview.

## Darker green refinement

Simplified the mask into a flat bandit-mask silhouette with tie details; removed the owl-like face/smile. Added a deep forest-green header with a white wordmark, darker tile text, stronger green borders and filled forest-green action buttons. Shortcut borders also have more definition. Today on Campus/My Hub source remains unchanged. This is still the unmerged review preview.

## Unified homepage palette

Product Owner requested the entire homepage match a slightly darker green. Header, logo, tile actions and footer now use #042F23. Scoped theme variables align Today on Campus/My Hub text, controls, borders, event backgrounds and time badges; yellow time badges are replaced with green/white. Functional behavior, content and layout remain unchanged. Build passed; actual 320/390/1280px browser checks showed no horizontal overflow. Footer was verified as RGB(4,47,35) with white text. Still preview-only in PR #35.

## Event preview and sign-in label

My Hub's guest button now reads “Sign in” and retains `/signin?next=hub`. Today on Campus shows up to four events instead of two; the complete-count “See all” link appears when more than four exist. Existing details and query behavior are preserved. Seven homepage tests and the production build passed; browser confirmed four live-data rows and the unchanged sign-in destination.

## Physical card artwork refinement

Replaced the blue app icon with the provider's current black card cover (October 2027 expiry). The downloaded official preview is preserved unchanged; CSS handles cover framing/orientation. Existing tile route/content/behavior unchanged. Production build passed.

## Discount illustration trial — November 13

Replaced the retail photo with an original SVG discount tag, oversized percent symbol, subtle string/shadow and forest-green background. Decorative asset uses existing tile link/label; no functionality or other tile changes.

Discount illustration validation: production build passed; browser checks at actual 390px and 1280px widths showed no document overflow. Saved phone and desktop screenshots; preview remains unmerged.
