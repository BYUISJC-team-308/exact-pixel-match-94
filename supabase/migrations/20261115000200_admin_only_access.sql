begin;

comment on table public.team_analytics_members is
  'Project-admin-managed list of team accounts excluded from OKR cohorts. No client writes.';

alter table public.profiles
  add column if not exists role text not null default 'USER';
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('USER', 'ADMIN'));

revoke insert, update on public.profiles from public, anon, authenticated;
revoke insert (role) on public.profiles from public, anon, authenticated;
revoke update (id, username, full_name, email, school, phone, avatar_url, interests, role)
  on public.profiles from public, anon, authenticated;
grant update (username, full_name, school, phone, avatar_url, interests)
  on public.profiles to authenticated;

create schema if not exists app_admin_private;
revoke all on schema app_admin_private from public, anon, authenticated;

create or replace function app_admin_private.exclude_admin_from_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.role = 'ADMIN' then
    insert into public.team_analytics_members(user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;
revoke all on function app_admin_private.exclude_admin_from_metrics() from public, anon, authenticated;

drop trigger if exists exclude_admin_from_metrics on public.profiles;
create trigger exclude_admin_from_metrics
  after insert or update of role on public.profiles
  for each row execute function app_admin_private.exclude_admin_from_metrics();

insert into public.team_analytics_members(user_id)
select id from public.profiles where role = 'ADMIN'
on conflict (user_id) do nothing;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  );
$function$;

revoke all on function public.current_user_is_admin() from public, anon, authenticated;
grant execute on function public.current_user_is_admin() to authenticated;

create or replace function public.team_okr_snapshot(
  p_signup_from timestamptz,
  p_signup_to timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.current_user_is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
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

revoke select, update, delete on public.data_issue_reports from public, anon, authenticated;
grant select, update, delete on public.data_issue_reports to authenticated;

drop policy if exists "allow read data_issue_reports" on public.data_issue_reports;
drop policy if exists "allow update data_issue_reports" on public.data_issue_reports;
drop policy if exists "allow delete data_issue_reports" on public.data_issue_reports;
drop policy if exists "Admins can read data issue reports" on public.data_issue_reports;
drop policy if exists "Admins can update data issue reports" on public.data_issue_reports;
drop policy if exists "Admins can delete data issue reports" on public.data_issue_reports;

create policy "Admins can read data issue reports"
  on public.data_issue_reports for select
  to authenticated
  using (public.current_user_is_admin());

create policy "Admins can update data issue reports"
  on public.data_issue_reports for update
  to authenticated
  using (public.current_user_is_admin())
  with check (
    public.current_user_is_admin()
    and status in ('open', 'reviewing', 'resolved', 'dismissed')
  );

create policy "Admins can delete data issue reports"
  on public.data_issue_reports for delete
  to authenticated
  using (public.current_user_is_admin());

revoke delete on public.deals, public.food_events from public, anon, authenticated;
drop policy if exists "Allow admins and users to delete deals" on public.deals;
drop policy if exists "Allow admins and users to delete food_events" on public.food_events;

create or replace function public.admin_delete_listing(
  p_item_type text,
  p_item_id text,
  p_report_id text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uuid uuid;
  v_report_uuid uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not public.current_user_is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  begin
    v_uuid := p_item_id::uuid;
  exception when others then
    v_uuid := null;
  end;

  if v_uuid is not null then
    if p_item_type = 'deal' then
      delete from public.deals where id = v_uuid;
    elsif p_item_type = 'event' then
      delete from public.food_events where id = v_uuid;
    end if;
  end if;

  if p_report_id is not null and p_report_id <> '' then
    begin
      v_report_uuid := p_report_id::uuid;
      update public.data_issue_reports
      set status = 'resolved',
          resolution_notes = coalesce(
            resolution_notes,
            'Listing permanently deleted by administrator.'
          ),
          resolved_at = timezone('utc'::text, now())
      where id = v_report_uuid;
    exception when others then
      null;
    end;
  end if;

  update public.data_issue_reports
  set status = 'resolved',
      resolution_notes = coalesce(
        resolution_notes,
        'Listing permanently deleted by administrator.'
      ),
      resolved_at = timezone('utc'::text, now())
  where item_id = p_item_id
    and status in ('open', 'reviewing');

  if not exists (
    select 1 from public.data_issue_reports where item_id = p_item_id
  ) then
    insert into public.data_issue_reports (
      item_type,
      item_id,
      item_label,
      issue_type,
      details,
      status,
      resolution_notes,
      resolved_at
    ) values (
      p_item_type,
      p_item_id,
      concat(initcap(p_item_type), ' (', p_item_id, ')'),
      'Listing permanently deleted by administrator',
      'Removed by administrator via moderation dashboard.',
      'resolved',
      'Listing permanently deleted by administrator.',
      timezone('utc'::text, now())
    );
  end if;
end;
$function$;

revoke all on function public.admin_delete_listing(text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_delete_listing(text, text, text)
  to authenticated, service_role;

commit;
