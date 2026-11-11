Read Me
# Student copy (P28)

- Counts distinguish loading, failed reads, and successful empty results on Discounts, Free Food, and Calendar. Retry actions remain visible.
- Account/profile/help copy explains actual profile benefits and browser-local saved items; guest/member account labels match their destinations.
- Room labels are consistent across Home, Calendar, List, Map, popups, and details. Missing organizer, food, and location fields are described as missing.
- Unsupported verified/daily/lifetime/sync claims and generic business taglines are replaced with factual guidance. Offer eligibility/source terms and the AI automation remain intact.
- Proposed wording, evidence, ownership boundaries, and Product Owner/new-tester acceptance checklist: [copy inventory](docs/student-copy-review.md).

# Footer destinations (P34)

- Shared footer links open `/about`, `/contact`, `/privacy`, and `/terms` without sign-in. Each page supports direct loads and links back home.
- Contact uses the approved `lotstarr@gmail.com` email and separates private requests from the public GitHub issue tracker. Listing issues use the existing report flow.
- Privacy describes the current Supabase account/profile behavior, browser-local saves and searches, activity metadata/local backup, location permission, and external services. Terms explain provider eligibility and the limits of personal tracking and map pins.
- Product Owner factual review is pending before publishing. See [review checklist](docs/footer-review.md). Do not mark P34 accepted until that review and live URL checks are recorded.

# Team OKR dashboard (P07)

- Open Profile → Team OKRs (or Team Analytics while signed out), then sign in with an approved dashboard account.
- Production reads only the restricted `team_okr_snapshot` aggregate RPC. No raw activity is downloaded or merged with local backups, and demo buttons no longer create production activity.
- All four KRs show their counting rules, sample sizes, targets, UTC signup period, calculation time, and data-readiness checks. The first-save timing target remains pending Product Owner agreement.
- Missing P06 signup/session/success markers produce **Tracking incomplete**, not fabricated zero-percent results. Seven-day retention excludes users whose full 168-hour window is unfinished.
- Setup, exact event contract, ownership boundaries, test examples, and deployment status: [OKR dashboard handoff](docs/okr-dashboard.md).
- Verify with `npm run test` and `npm run build`. SQL regression tests use an isolated local Postgres engine and never seed production analytics.

# Homepage behavioral requirements (P26 + homepage reset)

- Complete: mobile homepage explains student discounts, cardholder offers, and free-food events with three direct links.
- Homepage reset: those three paths have equal prominence and equal card heights, distinct icon/color cues, and plain eligibility guidance. They stack on phones and sit side by side on wider screens.
- Homepage reset: a shorter introduction and quieter page background replace the campus hero image. Map, Calendar, My Hub, and Help remain visible shortcuts.
- Homepage reset: discount and card-offer example panels are removed; Today on campus and My Hub remain. Shortcuts explain their destinations, and header navigation uses matching colored icons and an active-page ring.
- Homepage reset: My Hub prompts guests to sign in and returns them to the hub after login. Signed-in saved lists still expand, retry, and open details. Saves currently remain browser-local; account-backed storage remains P03/P04 work.
- Complete: a prominent My Hub shortcut reaches a compact preview of existing saved discounts and events; lists expand on request.
- Complete: long instructions live at `/help`; the homepage no longer includes the Verified Discounts section or static freshness/count claims.
- Complete: Today on Campus shows at most two events with access to the full calendar/list.
- Complete: query loading, failure/retry, empty, and unavailable-saved-item states are distinguished.
- Complete: the mobile header uses a collapsible search control to leave room for navigation on small phones.
- Not complete in P26: account-backed saved-item synchronization (P03/P04), a separate My Hub destination (P27), and shared copy review (P28).
- Verification: `npm run test`, production build, and browser checks at 320/390/430/768/1024/1280px. The homepage-reset design still needs review before merging and live verification before Product Owner acceptance.

# BYU Student Discounts and Free Food
## App Summary
BYU students can have trouble finding discounts that apply to them because offers are spread across different providers and sources. They may also miss free food events when event dates and locations are hard to keep track of. This app gives BYU students one place to find relevant discounts and campus food offerings. The Discount Dashboard lets students browse, search, filter, and save discounts. The Starving Student Card Hub lists card deals and helps students track which ones they have used, while the Free Food Near Me page and Calendar show upcoming food events. An interactive map shows where discounts and food offerings are located, and “Your Hub” brings saved discounts and events together.
## ERD
The ERD includes the `users`, `discounts`, `saved_discounts`, `redeemed_discounts`, and `food_events` entities.

![ERD Picture](is401mod5.png) 

## Tech Stack
Our team chose **Supabase as a backend-as-a-service**, with PostgreSQL as the database. We are using React and Vite for the frontend and Tailwind CSS for styling.
Supabase fits our team because it is accessible and provides a shared database without requiring us to build and maintain a separate backend server. PostgreSQL supports the foreign-key relationships in our data model, and the Supabase dashboard lets us view tables, add sample data, and check whether changes persist. Supabase also generates APIs from the database tables, which helps connect the frontend to the database without writing server routes from scratch. We chose this approach over Lovable because we can work directly with the database and avoid depending on a limited supply of AI-builder tokens. We will keep configuration in environment variables and exclude the `.env` file from Git.
## How to Get It Running

The project url is : studeats.vercel.app
> Check the repository’s `package.json` and Supabase setup, then replace the bracketed instructions with the exact steps for this project.
1. Clone the repository:
   git clone https://github.com/ThirstyCarrot/exact-pixel-match-94.git
2. Open the project directory:
   cd exact-pixel-match-94
3. Install the project dependencies:
   npm install
4. Configure the Supabase connection:
 	Your team must have a Supabase account. To create or access the project:
Go to https://app.supabase.com/
Log in with your team’s shared account (or invite your teammates to a new organization).
Click New Project.
Choose:
Project name (e.g., exact-pixel-match)
Region closest to your users
Database password (store in a .env file, never commit it)
After creation, you’ll see:
Project URL
anon key
service role key
	Required Environment Variables:
		Create a .env file in the project root containing these variable names:
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
		If the project uses server-side Supabase (Node backend), you may also see:
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=
		But never put the service role key or DB password in the frontend code.
	
How to Create or Seed the database:
		If your project includes SQL migrations or a schema file, you have two options:
Option 1 - Use Supabase Dashboard
Open your project → SQL Editor
Paste your schema SQL (tables, enums, policies)
Click Run
			


Option 2 - Use Supabase CLI (recommended for teams)
				If your repo contains a “supabase/” folder:
					In your terminal:
					npm install --save-dev supabase
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
				This applies all migrations automatically.
If the repo does not include migrations, you must manually create the tables in the dashboard or generate them using Supabase AI.

5. Start the app:
 	Correct start command:
In your Terminal:
npm run dev
Where the app opens:
 http://localhost:5173
If the project uses a different dev server (rare), the terminal will print the correct URL after running the command.

## Verifying the Vertical Slice

> Describe the button or action that updates the database. Give someone unfamiliar with the project enough information to test it.
- **Page or screen:** `[ENTER WHERE TO FIND THE ACTION]` Click the “Pin an item” button on the page.
- **Button or action:** `[ENTER WHAT TO CLICK OR SUBMIT]` Click the star next to your desired item!
- **Expected UI change:** `[DESCRIBE WHAT CHANGES ON SCREEN]` You should see your item pop up under “pinned items” on the page.
- **Database change:** `[NAME THE TABLE AND VALUE THAT SHOULD CHANGE]` The database adds rows for each pinned item, and deletes them as well.
- **Refresh check:** `[EXPLAIN HOW TO REFRESH AND CONFIRM THE CHANGE IS STILL THERE]` Click the classic f5 or reload the page, your pinned item will still be under “pinned items”!
