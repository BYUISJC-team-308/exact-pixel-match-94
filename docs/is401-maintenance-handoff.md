# IS401 user and record maintenance

The implementation extends Student Steals, using its existing landing-page images, email/password sign-in, Supabase Auth identities, profile rows, and Vercel deployment.

## Deployment — required before acceptance

1. In the existing Supabase project `zwygwfcaollyotvfwumx`, open SQL Editor and run `supabase/migrations/20261117000200_record_maintenance.sql`. This uses the existing `current_user_is_admin()` helper. The earlier `20261115000200_admin_only_access.sql` migration must already be installed. This feature does not depend on the separate catalog tracker migration.
2. Deploy the user function from the repository root with the Supabase CLI:

   ```sh
   supabase login
   supabase functions deploy maintain-users --project-ref zwygwfcaollyotvfwumx
   ```

   The function uses Supabase's built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server environment variables. Never place a service key in the frontend, `VITE_*` variables, GitHub, or assignment submission. The function independently verifies the bearer token with Auth and reads the caller's database role for every request. Keep the normal JWT gateway verification enabled.
3. Merge the reviewed PR into `main` and confirm the Vercel production deployment succeeds. The intended existing URL is https://studentsteals.vercel.app/ and the management route is `/maintain`.
4. Create a dedicated grading account through the existing Create Account flow using a team-controlled email and a unique password entered privately in the browser. Suggested username: `is401grader`; name: `IS401 Grading Account`. Complete any email confirmation required by the deployed Auth configuration. The Product Owner chose a dedicated shared grading account rather than TA self-registration. Do not commit its email/password as test fixtures or share a teammate’s personal login.
5. In Supabase SQL Editor, promote only that dedicated grading account. Replace the placeholder email before running:

   ```sql
   update public.profiles
   set role = 'ADMIN'
   where id = (
     select id from auth.users
     where lower(email) = lower('REPLACE_WITH_APPROVED_GRADING_EMAIL')
   );
   ```

   Confirm exactly one row was updated. Sign out and back in to refresh the role. This uses the existing ADMIN role and its analytics-exclusion trigger. Do not share an existing teammate's password.
6. Complete the live checks below in a fresh browser session. Submit the real production URL, dedicated account email, and privately chosen password through the assignment's private submission. Do not put working credentials in this repository. Credentials are not verified until this login succeeds.

## Behavior and scope

- Home and Profile show **Maintain Users**, **Maintain Records**, and **Logout** after an administrator's authenticated profile has loaded. Guest and ordinary student accounts do not see privileged controls. Direct management routes also check access, and the database/function enforce access independently.
- Maintain Records has a button for each business table: Discounts (`deals`), Free food events (`food_events`), Card offers (`ss_deals`), Colleges (`colleges`), Campuses (`campuses`), and Campus buildings (`campus_buildings`). Each supports create, paginated read/display, edit, and confirmed permanent deletion. The server only accepts these explicit table names. Forms follow the installed schema's nullability, defaults, enum choices, arrays, and JSON fields. Manual rows receive source keys where needed.
- Updates and deletes lock the selected record and compare the original row before changing it. Conflicts tell the admin to refresh. Constraints and foreign keys remain active. Deletion can cascade to dependent rows according to the existing schema and is clearly described before confirmation.
- IDs, timestamps, vote totals, owner IDs, provenance keys, generated columns, and verification status are system-managed. Auth, profile identity, votes, saved-item associations, analytics, and provider-managed storage are maintained through their existing workflows, not arbitrary raw-table editors. This is a business-data maintenance feature, not a generic editor for every internal database table.
- Maintain Users lists only selected Auth/profile fields, creates confirmed ordinary accounts using the provider Admin API, edits username/name/school, and deletes ordinary Auth accounts. The existing signup trigger creates the profile. If profile creation fails, the function attempts to roll back the new Auth account and reports cleanup failure honestly. Email/password changes and all administrator accounts remain in the provider's console. The web console cannot assign roles, delete administrators, or delete its own account. Linked records or owned files may prevent deletion and produce a recoverable message.
- Passwords go to Supabase Auth and are never saved as application profile fields. The sign-in fields are named `user_email` and `user_password`. Passwords are not returned from user-management requests.
- Logout calls the existing Supabase local sign-out, removes its current browser session through the provider, and clears account-specific saved-item state. The app uses Supabase browser session storage, not a custom authentication cookie. The maintenance UI unmounts after logout and its private query results are garbage-collected immediately. Logout does not remove unrelated provider cookies or sign the user out on other devices.
- Mobile forms use the existing accessible, scrollable dialog with labeled fields and at least 44px controls. Loading, empty, failure/retry, and mutation feedback remain separate. Buttons are disabled during writes. New routes use `noindex` metadata and remain protected regardless of indexing.

## Verification recorded before live deployment

- `npm test`: 235 tests passed, including provider-handler authorization and rollback, database CRUD and stale writes, schema/default behavior, unsupported fields/tables, guest UI hiding, failed-request feedback, and explicit deletion confirmation.
- `npm run build`: passed after installing the dependencies already declared on current main.
- Browser checks: the guest management route is blocked. The record screen and form were checked at 320px, 390px, and 1280px using sample data without horizontal overflow. Authenticated live CRUD was not exercised.
- The repository-wide TypeScript check still reports pre-existing errors outside these new maintenance files.
- Live login, CRUD persistence, logout/session restoration, and TA credentials remain pending the Supabase deployment and grading-account setup. Do not mark the assignment complete solely from local tests.

## Live grading walkthrough

1. At 360px and desktop widths, open Home while signed out. Confirm the image loads and management controls are absent. Open `/maintain` directly and confirm it does not expose users or records.
2. Try an invalid login. Confirm a clear error and usable retry. Sign in as the grading admin, return Home, and confirm both required buttons and Logout appear. An ordinary student's successful login should still hide administrative controls.
3. Maintain Users: create a disposable ordinary test account with a unique username and approved test email, display it, edit its name/school, refresh to confirm persistence, and sign in to that account in a separate browser. As the admin, delete only that disposable account, then confirm its login fails. Never test deletion with real team accounts.
4. Maintain Records: for each of the six table buttons, create a clearly labeled disposable record with valid required values/references, display it, edit it, refresh, and confirm it can be deleted. Test dependent campus records in child-before-parent deletion order. Check the relevant public page after a content change. The editor shows foreign-key fields as IDs: use real valid parent IDs from displayed records.
5. Open the same temporary record in two tabs, save one, then save the other. Confirm the stale edit is rejected. Try invalid required fields, enum/JSON values, and a failed network request; confirm no success message hides a failure.
6. Logout. Confirm management buttons and data disappear, refresh, and confirm a direct management URL is blocked. If logout fails, the UI must not pretend the session ended.
7. Only after these pass, record the deployed commit, URL, viewport evidence, and the privately shared grading credentials in the assignment handoff.
