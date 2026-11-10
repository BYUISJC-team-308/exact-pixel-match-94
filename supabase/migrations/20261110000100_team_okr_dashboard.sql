begin;

-- P07 only: read existing P06 events; do not change the logger or event table contract.
create schema if not exists app_okr_private;
revoke all on schema app_okr_private from public, anon, authenticated;

create table if not exists public.team_analytics_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  exclude_from_metrics boolean not null default true,
  added_at timestamptz not null default now()
);
alter table public.team_analytics_members enable row level security;
revoke all on public.team_analytics_members from public, anon, authenticated;
comment on table public.team_analytics_members is 'Project-admin-managed dashboard access. No client writes. Team accounts are excluded from OKR cohorts by default.';

create or replace function app_okr_private.snapshot(
  p_signup_from timestamptz, p_signup_to timestamptz, p_observed_at timestamptz
) returns jsonb
language sql stable security invoker set search_path = ''
as $function$
with cohort as (
  select u.id, u.created_at
  from auth.users u
  where u.created_at >= p_signup_from and u.created_at < p_signup_to
    and u.created_at <= p_observed_at
    and coalesce(to_jsonb(u)->>'is_anonymous', 'false') <> 'true'
    and not exists (
      select 1 from public.team_analytics_members m
      where m.user_id = u.id and m.exclude_from_metrics
    )
), source_events as (
  select l.*, to_jsonb(l) as row_data, c.created_at as signed_up_at
  from public.user_activity_logs l join cohort c on c.id = l.user_id
  where l.created_at >= c.created_at and l.created_at <= p_observed_at
), real_events as (
  select *,
    coalesce(nullif(row_data->>'session_id',''), nullif(metadata->>'session_id',''), nullif(metadata->>'sessionId','')) as visit_id,
    coalesce(nullif(row_data->>'event_id',''), nullif(metadata->>'event_id',''), nullif(metadata->>'request_id',''), id::text) as action_id,
    (coalesce(row_data->>'outcome', metadata->>'outcome') = 'success' or metadata->>'success' = 'true') as succeeded,
    (coalesce(row_data->>'outcome', metadata->>'outcome') in ('success','failure') or metadata->>'success' in ('true','false')) as outcome_known
  from source_events
  where not (coalesce(metadata, '{}'::jsonb) ? 'simUser')
    and not (coalesce(metadata, '{}'::jsonb) ? 'simulatedDelayMinutes')
    and coalesce(metadata->>'is_test','false') <> 'true'
    and coalesce(metadata->>'simulation','false') <> 'true'
    and coalesce(metadata->>'environment','production') not in ('test','demo','development')
), deduplicated as (
  select distinct on (user_id, action_id) * from real_events
  order by user_id, action_id, created_at, id
), signup_visits as (
  select distinct on (user_id) user_id, visit_id, created_at
  from deduplicated where event_type = 'signup' and visit_id is not null
  order by user_id, created_at, id
), later_visits as (
  select e.user_id, e.visit_id, min(e.created_at) as started_at
  from deduplicated e join signup_visits s on s.user_id = e.user_id
  where e.event_type = 'session_start' and e.visit_id is not null
    and e.visit_id <> s.visit_id and e.created_at > s.created_at
  group by e.user_id, e.visit_id
), successful_actions as (
  select * from deduplicated
  where event_type in ('deal_saved','deal_redeemed') and succeeded
), per_user as (
  select c.id, c.created_at,
    min(a.created_at) filter (where a.event_type = 'deal_saved') as first_save_at,
    coalesce(bool_or(a.event_type = 'deal_redeemed' and v.started_at is not null), false) as returned_and_used,
    coalesce(bool_or(a.event_type = 'deal_saved' and v.started_at is not null
      and a.created_at < c.created_at + interval '7 days'), false) as returned_and_saved_in_week
  from cohort c left join successful_actions a on a.user_id = c.id
  left join later_visits v on v.user_id = a.user_id and v.visit_id = a.visit_id and a.created_at >= v.started_at
  group by c.id, c.created_at
), totals as (
  select count(*) as users,
    count(*) filter (where first_save_at is not null) as savers,
    count(*) filter (where returned_and_used) as returning_users_who_used,
    count(*) filter (where created_at + interval '7 days' <= p_observed_at) as mature_users,
    count(*) filter (where created_at + interval '7 days' <= p_observed_at and returned_and_saved_in_week) as week_savers,
    round(avg(extract(epoch from (first_save_at - created_at)) / 60)::numeric, 1) as mean_minutes,
    round((percentile_cont(0.5) within group (order by extract(epoch from (first_save_at - created_at)) / 60))::numeric, 1) as median_minutes
  from per_user
), quality as (
  select
    (select count(*) from cohort c where not exists (select 1 from signup_visits s where s.user_id = c.id)) as missing_signup_sessions,
    (select count(*) from deduplicated where event_type in ('deal_saved','deal_redeemed') and not coalesce(outcome_known,false)) as missing_outcomes,
    (select count(*) from successful_actions where visit_id is null) as missing_action_sessions,
    (select count(*) from source_events) - (select count(*) from real_events) as excluded_simulations,
    (select count(*) from real_events) - (select count(*) from deduplicated) as excluded_duplicates,
    (select count(*) from deduplicated) as logged_events,
    (select max(created_at) from deduplicated) as last_event_at
), readiness as (
  select *, missing_signup_sessions = 0 and missing_outcomes = 0 and missing_action_sessions = 0 as complete
  from quality
)
select jsonb_build_object(
  'version', 1, 'observedAt', p_observed_at, 'signupFrom', p_signup_from, 'signupTo', p_signup_to,
  'totalUsers', t.users, 'matureUsers', t.mature_users, 'pendingUsers', t.users - t.mature_users,
  'noSaveUsers', case when q.complete then t.users - t.savers else null end,
  'firstSave', jsonb_build_object('meanMinutes', case when q.complete then t.mean_minutes else null end,
    'medianMinutes', case when q.complete then t.median_minutes else null end, 'sampleSize', t.savers, 'targetMinutes', null),
  'save', jsonb_build_object('numerator', t.savers, 'denominator', t.users, 'target', 50,
    'percent', case when q.complete then round(100.0 * t.savers / nullif(t.users,0),1) else null end),
  'reportedUse', jsonb_build_object('numerator', t.returning_users_who_used, 'denominator', t.users, 'target', 60,
    'percent', case when q.complete then round(100.0 * t.returning_users_who_used / nullif(t.users,0),1) else null end),
  'sevenDaySave', jsonb_build_object('numerator', t.week_savers, 'denominator', t.mature_users, 'target', 75,
    'percent', case when q.complete then round(100.0 * t.week_savers / nullif(t.mature_users,0),1) else null end),
  'quality', jsonb_build_object('complete', q.complete, 'missingSignupSessions', q.missing_signup_sessions,
    'missingOutcomes', q.missing_outcomes, 'missingActionSessions', q.missing_action_sessions,
    'excludedSimulations', q.excluded_simulations, 'excludedDuplicates', q.excluded_duplicates,
    'loggedEvents', q.logged_events, 'lastEventAt', q.last_event_at)
) from totals t cross join readiness q;
$function$;
revoke all on function app_okr_private.snapshot(timestamptz,timestamptz,timestamptz) from public, anon, authenticated;

create or replace function public.team_okr_snapshot(p_signup_from timestamptz, p_signup_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (select 1 from public.team_analytics_members where user_id = auth.uid()) then
    raise exception 'Team analytics access required' using errcode = '42501';
  end if;
  if p_signup_from is null or p_signup_to is null or p_signup_to <= p_signup_from
    or p_signup_to - p_signup_from > interval '366 days'
    or p_signup_from > now() or p_signup_to > now() + interval '1 day' then
    raise exception 'Choose a valid signup period of up to 366 days' using errcode = '22023';
  end if;
  return app_okr_private.snapshot(p_signup_from, p_signup_to, now());
end;
$function$;
revoke all on function public.team_okr_snapshot(timestamptz,timestamptz) from public, anon;
grant execute on function public.team_okr_snapshot(timestamptz,timestamptz) to authenticated;
comment on function public.team_okr_snapshot(timestamptz,timestamptz) is 'Team-only aggregate OKRs. Cohort = registered accounts created in [from,to). Readiness requires P06 session/success markers. No raw user data returned.';

commit;
