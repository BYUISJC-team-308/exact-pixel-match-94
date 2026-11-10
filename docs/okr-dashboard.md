# Reliable OKR dashboard — P07 handoff

## Scope and ownership

This implements the dashboard/calculations from P07 and supports Lot's OKR review card. **P06 timestamp instrumentation remains sharkgumbo's work.** The existing logger, auth calls, and save/use actions are not rewritten. This branch removes the old browser calculation/query and production simulation controls, adds a restricted SQL aggregate, and tests the replacement against known cases.

It does not implement P03/P04 account-backed saves or change Starving Student punch behavior.

## Counting rules

The selected signup dates are inclusive UTC dates. The client converts them to `[start midnight, midnight after end)`. The database uses its own current time as the observation cutoff. The maximum cohort selection is 366 days. Follow-up activity is observed through calculation time, not cut off at the last signup date.

| KR | Numerator/value | Denominator | Target |
| --- | --- | --- | --- |
| 1.1 | Mean signup-to-first successful recorded `deal_saved`; median also shown | Only cohort users with a confirmed save; users without a save shown separately when coverage is complete | Awaiting Product Owner approval; no invented five-minute target |
| 1.2 | Distinct registered cohort users with at least one successful recorded deal save | All cohort accounts, including accounts with no activity | 50% |
| 2.1 | Distinct cohort users with a successful `deal_redeemed` in a different later session | All cohort accounts | 60% |
| 2.2 | Distinct fully observed cohort users who save in a different later session before signup + 168 hours | Only cohort users whose full 168-hour window has elapsed | 75% |

KR 1.2 uses **ever successfully saved**, even if later unsaved. KR 2.1 measures **reported use**, not merchant-verified redemption. A later visit requires a distinct explicit session ID, its `session_start` after the recorded signup session, and an action at/after that session start. A `return_visit` event alone is insufficient. A save exactly at 168 hours is outside the first-seven-day window.

## P06 event contract — required integration

Read existing `public.user_activity_logs` fields: `id`, `user_id`, `device_id`, `event_type`, `metadata`, `created_at`. Account creation comes from `auth.users.created_at`; usernames and device IDs never define registered-user identity.

| Event | Required data | When to emit |
| --- | --- | --- |
| `signup` | `user_id`, `metadata.session_id`, timestamp | A registered account's initial visit; preserve the actual initial session across confirmation if necessary |
| `session_start` | `user_id`, `metadata.session_id`, timestamp | Once for each visit, with the P06 owner's documented visit-boundary rule |
| `deal_saved` | `user_id`, deal identifier, `metadata.session_id`, `metadata.outcome = "success"`, stable `metadata.event_id` or `metadata.request_id` | After the actual save succeeds; failed attempts must not be reported as successful saves |
| `deal_redeemed` | `user_id`, offer/deal identifier, same session/outcome/idempotency fields | After a reported-use change succeeds; undo/reset is not another positive use |

The reader also accepts top-level `session_id`, `event_id`, and `outcome` if P06 adds those columns; no event-table DDL is needed by P07. Legacy `metadata.sessionId` and boolean `metadata.success` are accepted aliases. Canonical success/failure values are `success` and `failure`.

The event writer must bind `user_id` to the authenticated account, establish server timestamps/idempotency, and enforce suitable write permissions. P07 does not turn a client-supplied success flag into independent proof of a successful database write. Those guarantees belong to P06 and the save/use persistence work.

Duplicate retries are identified per user by event/request ID; absent that, only the unique row ID is available. Device changes do not create new registered users. Events tagged `simUser`, `simulatedDelayMinutes`, `is_test=true`, `simulation=true`, or environment `test`, `demo`, or `development` are excluded. Historical untagged tests cannot be identified automatically: administrators should exclude known test accounts.

## Readiness and missing history

The dashboard withholds all percentages and first-save timing if any selected account lacks a recorded signup session, or any recorded save/use lacks a known outcome, or a successful action lacks a session ID. It still shows confirmed observed counts and explains the missing fields. Choose a cohort recorded after P06 instrumentation is active; do not invent historical sessions or infer account ownership from devices.

This gate detects known missing fields; it cannot prove that every real-world action was emitted. Event names, auth linking, successful writes, retries, and session boundaries still require end-to-end P06 checks.

Empty cohorts and zero mature-user denominators show no percentage. No-save users are never included as zero-minute first saves. The dashboard does not merge localStorage, download raw logs, truncate at 500 rows, or offer production simulation buttons.

## Database setup and access

Migration: `supabase/migrations/20261110000100_team_okr_dashboard.sql`.

- `team_analytics_members`: administrator-managed allowlist. RLS enabled; clients have no direct read/write grant. Each member is excluded from OKR cohorts by default (`exclude_from_metrics=true`).
- `app_okr_private.snapshot`: private calculation helper; no public, anonymous, or authenticated execute permission.
- `team_okr_snapshot`: authenticated aggregate RPC; checks membership before reading user/activity data. No user IDs, emails, usernames, or devices are returned. Anonymous execute permission is revoked.
- Apply the migration before deploying the UI. If applied through SQL Editor, the idempotent migration can be replayed by the repository migration workflow later.
- To authorize another teammate, a project administrator should insert that person's existing `auth.users.id` into `team_analytics_members`. Membership is never editable by website users.

Production setup verified during this work: the aggregate functions and membership table were applied, the requested account was authorized, and anonymous RPC/raw membership access were confirmed false. The initial 30-day snapshot had **2 non-team cohort users, 0 linked qualifying events, and 2 missing signup sessions**. Accordingly, results correctly report tracking incomplete. There is no claim that P06 is finished or that the KRs have reached their targets.

## Verification

`src/test/analytics.test.ts` executes the actual migration in PGlite (Postgres) against isolated test tables/roles. It checks exact timing, distinct users across devices, repeated saves, failed actions, duplicate requests, simulations, later-session requirements, unknown legacy data, the exact 168-hour boundary, team exclusions, empty cohorts, more than 500 events, permission denial, and allowed aggregate access.

One known cohort has four users (three mature), saves at 4/8/2 minutes, one later-session save/use, and one never-save user. Expected results: mean 4.7 minutes, median 4, save conversion 75%, later-session reported use 25%, seven-day return-and-save 33.3%, and one pending user.

`team-okr.test.ts` covers UTC dates, invalid periods, permission/setup errors and refusal to substitute local events. `okr-dashboard.test.tsx` covers all four displays, incomplete-data states, sign-in, loading and retry.

Before Product Owner acceptance: confirm the first-save target and mean/median choice; agree the documented cohort/window definitions; complete P06; verify a real account's signup → save → later visit → save/use against stored rows; and reconcile the displayed aggregate without using production demo events.
