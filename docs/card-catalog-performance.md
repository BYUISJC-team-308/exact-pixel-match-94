# P33: full card catalog performance

Implementation ready for review. Production merge and live acceptance are pending.
Owner: Lot Holmstead. Catalog at measurement: **633 real offers**.

## Why paginate

The live list mounted all 633 cards: 6,901 DOM elements and a 114,556px document at 390px. Grid mode mounted 633 images and 10,923 elements. Rendering only one page addresses this observed cost without hiding any inventory or introducing a virtualization dependency.

| Measure | Before | Optimized | Scope |
| --- | ---: | ---: | --- |
| Mounted offers | 633 | 24 | List or grid; last page contains the remainder |
| List DOM elements | 6,901 | 512 | Verified 390px viewport, first full-catalog page |
| Grid images | 633 | At most 24 | Only the current page loads logos |
| Initial HTML, uncompressed | 1,246,503 B | 397,153 B | About 68% smaller; complete catalog data still serialized |

Search/filter/sort still operate on all records before pagination. Existing category grouping is preserved, and each category label describes all matching records rather than just the mounted subset. The page heading states the visible range and total matches. Page selection, Previous, and Next controls exist above and below results.

## Implementation and state

- Page size: 24, shared by list and grid.
- URL state: query, category, type/status filters, sort, view, and page. Filter/search/sort changes reset page 1. View changes preserve page. Reload/back and detail dismissal retain the URL criteria.
- Computed filtering, sorting, and grouping are memoized so opening details or animation state does not recompute the whole catalog.
- Five-minute route freshness avoids repeated catalog requests during navigation. An observed search-plus-page-change sequence produced **zero additional network requests**.
- Supabase reads use explicit ordered ranges with an ID tie-breaker. Tests cover 1,001 records and a failure in a later batch; failures do not display partial results. The current 633-row catalog takes one catalog request.
- Loading has a pending message, failed reads have retry, and an empty successful result remains distinct. An empty catalog cannot show `NaN%` completion.
- Sort label/control have deliberate wrapping and a 44px select; this covers the related Feature 16 regression without rewriting its other work.
- Punch store, reset behavior, analytics contract, and existing detail dialog remain unchanged. P30 owns punch feedback/reset changes.

## Timing and network observations

These are browser-emulation samples, not physical-phone benchmarks or statistical guarantees.
Profile: 390×844, 4× CPU slowdown, 150ms latency, 200,000 B/s download, 93,750 B/s upload, cache disabled. Baseline and optimized Node production bundles were served on localhost ports 8086 (old renderer) and 8087 (optimized renderer). Both used the real Supabase catalog.

| Sample | First byte | First contentful paint | DOMContentLoaded | Load | HTML transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline, same-host production | 272ms | 3,584ms | 11,834ms | 11,933ms | 1,246,803 B |
| Optimized, full catalog | 3,872ms | 7,136ms | 11,197ms | 11,216ms | 397,453 B |
| Optimized repeat, persisted pizza filter/page | 5,603ms | 8,876ms | 12,898ms | 12,916ms | 389,184 B |

First-byte delay varied enough to dominate these samples; **a load-time or first-paint speedup is not established**. The repeat has different criteria and is recorded as a variance check, not a like-for-like performance improvement. Node serves uncompressed HTML; do not compare these transfer totals directly with Vercel compression. The live baseline HTML transferred 85,002 B compressed and decoded to the same 1,246,503 B.

The initial throttled navigation wrapper stalled and its timing was excluded. Subsequent reloads were initiated separately and checked with bounded polling. The stall should not be interpreted as an application regression.

An automation-bracketed `pizza` search at 4× CPU recorded about 105ms of main-thread task work before and 126ms after. URL-state navigation adds work; this is **not** an input-to-paint/INP measurement and does not establish a search speedup. Both found the same 43 offers. A two-page scroll probe recorded 123ms versus 11ms task work at desktop layout/4× CPU; this is a single indicative observation, not an FPS or dropped-frame benchmark.

Raw observations: [live baseline](card-catalog-before.json), [production and interaction observations](card-catalog-after.json). Further controlled repetitions on a physical phone and the deployed preview are recommended before setting a latency target. Investigate first-byte variance separately rather than hiding it behind a DOM-size claim.

## Verification

- **72 tests across 18 files passed**; production build, changed-source ESLint, and whitespace checks passed. Repository-wide pre-existing TypeScript errors remain; none were reported in changed catalog source/tests.
- Automated: visit all 27 pages and see every one of 633 IDs exactly once; full-catalog search/type filters, late offer 632, sort-before-paging, view/detail state preservation, correct punch IDs/count changes, no matches/reset, successful empty catalog, invalid URL state, pending/error/retry, stable ranges past 1,000 and later-batch errors.
- Browser: page 27 shows offers 625–633; `Zootah` remains searchable and survives reload; `pizza` returns 43 matches. Filter/page changes did not refetch data. List and grid stay bounded.
- Browser: actual Allstar offer details and three-use tracking stayed in sync from 0→1→2→3 uses. Restored the local test offer to unused. Analytics insert requests were temporarily blocked during this local test and then unblocked; no synthetic punch events were sent to production analytics.
- Verified 320px sort control stays inside the viewport, 390px list fits, and desktop works. Pagination moves focus to the range heading; native page/sort selects and visible focus support keyboard use.
- User-specific local saved state was not reset globally. No database or authentication migration.

## Acceptance still required

Review and merge the PR; rerun the journeys at the live `/starving-student` URL and attach the deployed commit. Verify on a physical phone, including scrolling and touch keyboard. Check the separate P32 hydration work and P30 punch feedback work with their owners before final mobile acceptance. Do not mark all performance acceptance complete based only on lower DOM/payload counts.
