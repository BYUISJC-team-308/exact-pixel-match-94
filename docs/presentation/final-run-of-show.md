# Student Steals final presentation

Site: **studeats.vercel.app**  
[Download the QR code](student-steals-qr.png) · [Open the site](https://studeats.vercel.app/) · [GitHub](https://github.com/BYUISJC-team-308/exact-pixel-match-94)

## Five-minute run of show

| Time | Speaker | What to show or say |
|---|---|---|
| 0:00–0:40 | Lot | Show the QR and short URL while everyone opens the site. Open Home. “A student discount is only useful if you find it before you pay. A campus event with free food is only useful if you know when and where it happens. We built one place to check both.” Point out the three routes on Home. |
| 0:40–1:40 | Bryce | “We organized the product around how students actually look: discounts, cardholder offers, and campus food.” Open Discounts, filter a category, open an offer with terms, and save one on the presentation account. Then open Starving Student Card, search a merchant, and open a cardholder offer. |
| 1:40–2:50 | Jacob | Open Free Food, select an upcoming verified event, and show the time, building, food, and source when available. Open Map and select that campus area or another pinned event. Explain how students go from finding food to finding the location. |
| 2:50–4:25 | Matt | Open the GitHub Actions verification run and show the raw sample becoming a category and deal type through Gemini. Explain how scheduled ingestion writes classified offers to Supabase and where those offers appear on Discounts. Show the live My Hub save from the earlier demo and briefly connect these actions to the four OKRs. |
| 4:25–5:00 | Lot | “Open Student Steals on your phone and try one search or filter. You can look around before signing in.” Put the QR and URL back on screen. Aim to finish by 4:50. |

Speaker assignments are proposed. Rehearse with the full team. Keep the five graded pages to Home, Discounts, Starving Student Card, Free Food, and Map. Calendar and Profile are available if asked. Before class, check the selected offer and event are still current, open tabs in demo order, and use a separate presentation account with no personal information on screen.

## AI workflow walkthrough

Open [Daily Student Deals Scraper](https://github.com/BYUISJC-team-308/exact-pixel-match-94/actions/workflows/daily-scraper.yml). The verification option calls the same Gemini batch classifier used by ingestion with a synthetic bike-repair offer, prints the category and deal type, then exits without changing listings. It requires the existing repository Actions secret `GEMINI_API_KEY`. When the workflow succeeds, use its log to show the model name and “Applied 1 Gemini classifications.” A normal scraper run fetches sources, classifies uncategorized offers and writes listings to Supabase. The most recent audited production run used rules because the key was absent. Prove one successful Gemini run before presenting the AI step as working.

## Record the OKR video in 90 seconds

Open the team-only OKR dashboard and the app in separate browser profiles. Choose a signup date range with complete tracking and a small denominator. Verify every planned action moves the displayed value before recording. Use real app actions and refresh the dashboard after each one. Keep recordings free of email addresses and credentials.

| Clip | Action and visible result |
|---|---|
| 0–10 s | Show the cohort dates and baseline on the team dashboard. |
| 10–30 s | From an account with a recorded signup and no prior save, save its first discount. Refresh. Show KR 1.1 moving from blank or changing its mean and KR 1.2 gaining a saver. |
| 30–50 s | From a qualifying later visit, mark an offer used using its real control. Refresh and show KR 2.1 change. |
| 50–80 s | Show a real return-and-save action from within 168 hours of signup, then show the refreshed KR 2.2 after that account has completed the full seven-day observation window. Use a timestamped before/after cut if the observation period cannot fit in the recording. |
| 80–90 s | Show all four KRs and their targets with the same cohort dates. |

The current dashboard excludes accounts with incomplete tracking from certification and waits for mature seven-day cohorts. Find an eligible real cohort first. If nobody qualifies yet, start a test signup now, return in a distinct session and save before day seven, and allow the observation window to finish. If the deadline comes first, ask the professor what evidence is acceptable for this metric. Do not change the metric rules or seed activity just to make the recording work.

## FigJam handoff

Copy the Module 11 template beside Sprint 1 and Sprint 2 and name the new section Sprint 3. Fill the site and repo links, insert the QR, paste the OKR definitions and verified video link, and describe the AI workflow. Use Trello for the actual sprint goal, burndown, card estimates and recorded time. Pull the sprint commit history from GitHub. Have each teammate confirm their attendance, role, and contribution before completing the attendance and hours sections. Use the board’s existing sprint retrospective or review notes for those prompts. Treat pricing, acquisition channels and costs in the Business Plan as team-approved assumptions, with any unverified items marked as such. Submit the **page link** in Canvas after the board is complete. Each member completes their own peer/classmate evaluation after presentations.

| Objective | Key result |
|---|---|
| Find relevant savings and food quickly | Average signup to first saved discount under 5 minutes. |
| Find relevant savings and food quickly | At least 50% of accounts save a discount. |
| Give students a reason to come back | At least 60% return and report an offer used in a later visit. |
| Give students a reason to come back | At least 75% of fully observed accounts return and save a discount within seven days of signup. |
