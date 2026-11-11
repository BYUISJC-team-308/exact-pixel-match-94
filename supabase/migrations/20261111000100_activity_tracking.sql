begin;

-- Bind writes to the authenticated caller. Browser roles retain no table grants.
create index if not exists activity_logs_user_type_idx
  on public.user_activity_logs (user_id, event_type);

create or replace function public.record_studeats_activity(
  p_event_id uuid, p_visit_id uuid, p_device_id uuid, p_expected_user uuid,
  p_event_type text, p_item_id text default null
) returns void
language plpgsql security definer set search_path = ''
as $function$
declare
  account_id uuid := auth.uid();
  recorded_at timestamptz := clock_timestamp();
begin
  if account_id is null or account_id is distinct from p_expected_user then
    raise exception 'Authenticated account required' using errcode = '42501';
  end if;
  if p_event_id is null or p_visit_id is null or p_device_id is null
    or p_event_type is null or p_event_type not in (
      'session_start','deal_saved','deal_redeemed','event_saved',
      'map_opened','map_location_enabled','map_pin_selected','map_offer_viewed','map_directions_opened'
    )
    or (p_event_type in ('deal_saved','deal_redeemed','event_saved') and
        (p_item_id is null or length(btrim(p_item_id)) = 0))
    or length(p_item_id) > 160 then
    raise exception 'Invalid activity' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(account_id::text || ':' || p_visit_id::text, 0));
  recorded_at := clock_timestamp();
  if not exists (
    select 1 from public.user_activity_logs
    where user_id = account_id and event_type = 'session_start'
      and metadata->>'session_id' = p_visit_id::text
  ) then
    insert into public.user_activity_logs (user_id, device_id, event_type, metadata, created_at)
    values (account_id, p_device_id::text, 'session_start',
      jsonb_build_object('session_id', p_visit_id), recorded_at);
  end if;

  if p_event_type <> 'session_start' then
    insert into public.user_activity_logs (id, user_id, device_id, event_type, metadata, created_at)
    values (p_event_id, account_id, p_device_id::text, p_event_type,
      jsonb_strip_nulls(jsonb_build_object('session_id', p_visit_id, 'event_id', p_event_id,
        'outcome', 'success', 'item_id', p_item_id)), recorded_at)
    on conflict (id) do nothing;
  end if;
end;
$function$;
revoke all on function public.record_studeats_activity(uuid,uuid,uuid,uuid,text,text) from public, anon;
grant execute on function public.record_studeats_activity(uuid,uuid,uuid,uuid,text,text) to authenticated;

-- Signup can require email confirmation, so record the initial visit at account
-- creation from the real Auth row. Invalid or absent optional metadata is ignored.
create or replace function app_okr_private.record_signup()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
  visit text := new.raw_user_meta_data->>'studeats_signup_visit';
  device text := new.raw_user_meta_data->>'studeats_signup_device';
begin
  if visit ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    and device ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    insert into public.user_activity_logs (user_id, device_id, event_type, metadata, created_at)
    values
      (new.id, device, 'session_start', jsonb_build_object('session_id', visit), new.created_at),
      (new.id, device, 'signup', jsonb_build_object('session_id', visit), new.created_at);
  end if;
  return new;
end;
$function$;
revoke all on function app_okr_private.record_signup() from public, anon, authenticated;
create or replace trigger studeats_record_signup
  after insert on auth.users for each row execute function app_okr_private.record_signup();

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
  return jsonb_set(app_okr_private.snapshot(p_signup_from, p_signup_to, now()),
    '{firstSave,targetMinutes}', '5'::jsonb);
end;
$function$;

commit;
